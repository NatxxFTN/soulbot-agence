'use strict';

const fs = require('fs');
const path = require('path');

const SKIPPED_CATEGORIES = new Set(['protection', 'moderation', 'owner']);
const REQUIRED_EXPORT_FIELDS = [
  'name',
  'aliases',
  'category',
  'description',
  'usage',
  'cooldown',
  'execute',
];

const repoRoot = path.resolve(__dirname, '..');
const commandsRoot = path.join(repoRoot, 'bot', 'commands');
const reportsDir = path.join(repoRoot, 'reports');
const reportPath = path.join(reportsDir, 'command-audit.json');

function toPosixPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function resolveScope(input) {
  if (!input) return commandsRoot;
  return path.resolve(process.cwd(), input);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function getCategory(filePath) {
  const relative = path.relative(commandsRoot, filePath);
  const firstPart = relative.split(path.sep)[0];
  return firstPart && firstPart !== '..' ? firstPart : null;
}

function shouldSkipPath(targetPath) {
  const category = getCategory(targetPath);
  return category && SKIPPED_CATEGORIES.has(category);
}

function walkJsFiles(targetPath, files) {
  if (!fs.existsSync(targetPath) || shouldSkipPath(targetPath)) return;

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (targetPath.endsWith('.js') && !shouldSkipPath(targetPath)) {
      files.push(targetPath);
    }
    return;
  }

  if (!stat.isDirectory()) return;

  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const nextPath = path.join(targetPath, entry.name);
    if (entry.isDirectory() && shouldSkipPath(nextPath)) continue;
    if (entry.isDirectory() || (entry.isFile() && entry.name.endsWith('.js'))) {
      walkJsFiles(nextPath, files);
    }
  }
}

function lineNumberAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function stripComments(source) {
  let output = '';
  let state = 'code';
  let quote = '';

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (state === 'lineComment') {
      if (char === '\n') {
        output += char;
        state = 'code';
      } else {
        output += ' ';
      }
      continue;
    }

    if (state === 'blockComment') {
      if (char === '*' && next === '/') {
        output += '  ';
        i += 1;
        state = 'code';
      } else {
        output += char === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (state === 'string') {
      output += char;
      if (char === '\\') {
        if (next) {
          output += next;
          i += 1;
        }
        continue;
      }
      if (char === quote) state = 'code';
      continue;
    }

    if (char === '/' && next === '/') {
      output += '  ';
      i += 1;
      state = 'lineComment';
      continue;
    }

    if (char === '/' && next === '*') {
      output += '  ';
      i += 1;
      state = 'blockComment';
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      state = 'string';
      output += char;
      continue;
    }

    output += char;
  }

  return output;
}

function extractObjectAfter(source, startIndex) {
  const openIndex = source.indexOf('{', startIndex);
  if (openIndex === -1) return null;

  let depth = 0;
  let state = 'code';
  let quote = '';

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (state === 'lineComment') {
      if (char === '\n') state = 'code';
      continue;
    }

    if (state === 'blockComment') {
      if (char === '*' && next === '/') {
        i += 1;
        state = 'code';
      }
      continue;
    }

    if (state === 'string') {
      if (char === '\\') {
        i += 1;
        continue;
      }
      if (char === quote) state = 'code';
      continue;
    }

    if (char === '/' && next === '/') {
      i += 1;
      state = 'lineComment';
      continue;
    }

    if (char === '/' && next === '*') {
      i += 1;
      state = 'blockComment';
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      state = 'string';
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }

  return null;
}

function extractModuleExportsObject(source) {
  const match = /module\s*\.\s*exports\s*=\s*{/.exec(source);
  if (!match) return null;
  return extractObjectAfter(source, match.index);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasExportField(source, exportObject, field) {
  const fieldPattern = escapeRegex(field);
  const objectPatterns = [
    new RegExp(`(?:^|[,\\n\\r])\\s*(?:async\\s+)?${fieldPattern}\\s*(?=[:(,}])`),
    new RegExp(`(?:^|[,\\n\\r])\\s*['"\`]${fieldPattern}['"\`]\\s*:`),
  ];

  if (exportObject && objectPatterns.some(pattern => pattern.test(exportObject))) {
    return true;
  }

  return new RegExp(`exports\\s*\\.\\s*${fieldPattern}\\s*=`).test(source)
    || new RegExp(`module\\s*\\.\\s*exports\\s*\\.\\s*${fieldPattern}\\s*=`).test(source);
}

function readStringExport(source, exportObject, field) {
  const fieldPattern = escapeRegex(field);
  const objectPatterns = [
    new RegExp(`(?:^|[,\\n\\r])\\s*${fieldPattern}\\s*:\\s*(['"\`])([^'"\`\\r\\n]*)\\1`),
    new RegExp(`(?:^|[,\\n\\r])\\s*['"\`]${fieldPattern}['"\`]\\s*:\\s*(['"\`])([^'"\`\\r\\n]*)\\1`),
  ];

  if (exportObject) {
    for (const pattern of objectPatterns) {
      const match = pattern.exec(exportObject);
      if (match) return match[2];
    }
  }

  const assignmentPatterns = [
    new RegExp(`exports\\s*\\.\\s*${fieldPattern}\\s*=\\s*(['"\`])([^'"\`\\r\\n]*)\\1`),
    new RegExp(`module\\s*\\.\\s*exports\\s*\\.\\s*${fieldPattern}\\s*=\\s*(['"\`])([^'"\`\\r\\n]*)\\1`),
  ];

  for (const pattern of assignmentPatterns) {
    const match = pattern.exec(source);
    if (match) return match[2];
  }

  return null;
}

function readAliases(source, exportObject) {
  const patterns = [
    /(?:^|[,\n\r])\s*aliases\s*:\s*\[([\s\S]*?)\]/,
    /(?:^|[,\n\r])\s*['"`]aliases['"`]\s*:\s*\[([\s\S]*?)\]/,
  ];

  if (exportObject) {
    for (const pattern of patterns) {
      const match = pattern.exec(exportObject);
      if (match) return readStringLiterals(match[1]);
    }
  }

  const assignmentPatterns = [
    /exports\s*\.\s*aliases\s*=\s*\[([\s\S]*?)\]/,
    /module\s*\.\s*exports\s*\.\s*aliases\s*=\s*\[([\s\S]*?)\]/,
  ];

  for (const pattern of assignmentPatterns) {
    const match = pattern.exec(source);
    if (match) return readStringLiterals(match[1]);
  }

  return [];
}

function readStringLiterals(source) {
  const values = [];
  const regex = /(['"`])([^'"`\r\n]*?)\1/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    values.push(match[2]);
  }
  return values;
}

function findUnicodeEmoji(source) {
  let emojiRegex;
  try {
    emojiRegex = new RegExp('\\p{Extended_Pictographic}(?:[\\uFE0E\\uFE0F]|\\u200D\\p{Extended_Pictographic})*', 'gu');
  } catch (error) {
    emojiRegex = /[\u{1F000}-\u{1FAFF}]/gu;
  }

  const findings = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const matches = new Set();
    let match;
    emojiRegex.lastIndex = 0;
    while ((match = emojiRegex.exec(lines[i])) !== null) {
      matches.add(match[0]);
    }
    for (const emoji of matches) {
      findings.push({ line: i + 1, emoji });
    }
  }
  return findings;
}

function resolveRelativeRequire(filePath, request) {
  const basePath = path.resolve(path.dirname(filePath), request);
  const candidates = [];

  function add(candidate) {
    candidates.push(candidate);
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  }

  if (fs.existsSync(basePath)) {
    const stat = fs.statSync(basePath);
    if (stat.isFile()) return { exists: true, target: basePath };
    if (stat.isDirectory()) {
      const packageJson = path.join(basePath, 'package.json');
      candidates.push(packageJson);
      if (fs.existsSync(packageJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg && typeof pkg.main === 'string') {
            const mainPath = path.join(basePath, pkg.main);
            if (fs.existsSync(mainPath) && fs.statSync(mainPath).isFile()) {
              return { exists: true, target: mainPath };
            }
            candidates.push(mainPath);
          }
        } catch (error) {
          candidates.push(`${packageJson} (invalid package.json)`);
        }
      }
      for (const entry of ['index.js', 'index.json', 'index.node']) {
        const indexPath = path.join(basePath, entry);
        if (add(indexPath)) return { exists: true, target: indexPath };
      }
    }
  } else {
    candidates.push(basePath);
  }

  for (const extension of ['.js', '.json', '.node']) {
    const candidate = `${basePath}${extension}`;
    if (add(candidate)) return { exists: true, target: candidate };
  }

  return { exists: false, candidates };
}

function findBrokenRequires(filePath, source) {
  const findings = [];
  const regex = /require\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  let match;

  while ((match = regex.exec(source)) !== null) {
    const request = match[2];
    if (!request.startsWith('./') && !request.startsWith('../')) continue;

    const resolution = resolveRelativeRequire(filePath, request);
    if (!resolution.exists) {
      findings.push({
        line: lineNumberAt(source, match.index),
        request,
        candidates: resolution.candidates.map(toPosixPath),
      });
    }
  }

  return findings;
}

function auditFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const sourceWithoutComments = stripComments(source);
  const exportObject = extractModuleExportsObject(sourceWithoutComments);
  const fileCategory = getCategory(filePath);
  const exportedCategory = readStringExport(sourceWithoutComments, exportObject, 'category');
  const missingFields = REQUIRED_EXPORT_FIELDS.filter(field => !hasExportField(sourceWithoutComments, exportObject, field));
  const usesEmbedBuilder = /\bEmbedBuilder\b/.test(sourceWithoutComments);
  const usesComponentsV2 = /\bContainerBuilder\b/.test(sourceWithoutComments)
    && /\bMessageFlags\s*\.\s*IsComponentsV2\b/.test(sourceWithoutComments);

  return {
    path: toPosixPath(filePath),
    category: exportedCategory || fileCategory,
    fileCategory,
    exportedCategory,
    name: readStringExport(sourceWithoutComments, exportObject, 'name'),
    aliases: readAliases(sourceWithoutComments, exportObject),
    usesEmbedBuilder,
    usesComponentsV2,
    hardcodedUnicodeEmoji: findUnicodeEmoji(source),
    missingFields,
    nameOrAliasCollision: [],
    brokenRequire: findBrokenRequires(filePath, sourceWithoutComments),
    issueCount: 0,
  };
}

function buildCollisionIndex(commands) {
  const index = new Map();

  for (const command of commands) {
    const tokens = [];
    if (command.name) tokens.push({ value: command.name, kind: 'name' });
    for (const alias of command.aliases) tokens.push({ value: alias, kind: 'alias' });

    for (const token of tokens) {
      const key = token.value.toLowerCase();
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({
        kind: token.kind,
        value: token.value,
        name: command.name,
        path: command.path,
      });
    }
  }

  return index;
}

function attachCollisions(commands) {
  const index = buildCollisionIndex(commands);
  let collisionTokenCount = 0;

  for (const owners of index.values()) {
    const uniquePaths = new Set(owners.map(owner => owner.path));
    if (uniquePaths.size > 1) collisionTokenCount += 1;
  }

  for (const command of commands) {
    const tokens = [];
    if (command.name) tokens.push({ value: command.name, kind: 'name' });
    for (const alias of command.aliases) tokens.push({ value: alias, kind: 'alias' });

    const collisions = [];
    const seenValues = new Set();

    for (const token of tokens) {
      const key = token.value.toLowerCase();
      if (seenValues.has(key)) continue;
      seenValues.add(key);

      const owners = index.get(key) || [];
      const conflicts = owners
        .filter(owner => owner.path !== command.path)
        .map(owner => ({
          path: owner.path,
          name: owner.name,
          kind: owner.kind,
        }));

      if (conflicts.length > 0) {
        collisions.push({
          value: token.value,
          kind: token.kind,
          with: conflicts,
        });
      }
    }

    command.nameOrAliasCollision = collisions;
  }

  return collisionTokenCount;
}

function recomputeIssueCount(command) {
  command.issueCount = command.missingFields.length
    + (command.usesEmbedBuilder ? 1 : 0)
    + command.hardcodedUnicodeEmoji.length
    + command.nameOrAliasCollision.length
    + command.brokenRequire.length;
}

function summarizeTotals(commands, collisionTokenCount) {
  return {
    commands: commands.length,
    legacyEmbed: commands.filter(command => command.usesEmbedBuilder).length,
    unicodeEmoji: commands.filter(command => command.hardcodedUnicodeEmoji.length > 0).length,
    nameOrAliasCollisionCommands: commands.filter(command => command.nameOrAliasCollision.length > 0).length,
    nameOrAliasCollisionTokens: collisionTokenCount,
    brokenRequires: commands.reduce((total, command) => total + command.brokenRequire.length, 0),
    missingFields: commands.reduce((total, command) => total + command.missingFields.length, 0),
  };
}

function groupByCategory(commands) {
  const grouped = {};
  for (const command of commands) {
    const category = command.category || '(unknown)';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(command);
  }

  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => b.issueCount - a.issueCount || a.path.localeCompare(b.path));
  }

  return Object.fromEntries(Object.keys(grouped).sort().map(category => [category, grouped[category]]));
}

function formatList(values) {
  return values.length ? values.join(', ') : 'none';
}

function printConsoleReport(grouped, totals, scopePath) {
  console.log(`Command audit scope: ${toPosixPath(scopePath) || '.'}`);
  console.log(`Skipped categories: ${Array.from(SKIPPED_CATEGORIES).join(', ')}`);
  console.log('');

  for (const [category, commands] of Object.entries(grouped)) {
    console.log(`[${category}]`);
    for (const command of commands) {
      const commandName = command.name || '(missing name)';
      console.log(
        `  ${commandName} | issues=${command.issueCount} | legacyEmbed=${command.usesEmbedBuilder}`
        + ` | componentsV2=${command.usesComponentsV2}`
        + ` | unicode=${command.hardcodedUnicodeEmoji.length}`
        + ` | collisions=${command.nameOrAliasCollision.length}`
        + ` | brokenRequire=${command.brokenRequire.length}`
        + ` | missing=${formatList(command.missingFields)}`
        + ` | ${command.path}`
      );
    }
    console.log('');
  }

  console.log('Totals');
  console.log(`  Commands: ${totals.commands}`);
  console.log(`  Legacy EmbedBuilder: ${totals.legacyEmbed}`);
  console.log(`  Unicode emoji: ${totals.unicodeEmoji}`);
  console.log(`  Name/alias collisions: ${totals.nameOrAliasCollisionTokens} tokens (${totals.nameOrAliasCollisionCommands} commands)`);
  console.log(`  Broken requires: ${totals.brokenRequires}`);
  console.log(`  Missing fields: ${totals.missingFields}`);
}

function main() {
  const scopePath = resolveScope(process.argv[2]);
  if (!isInside(commandsRoot, scopePath)) {
    console.error(`Refusing to audit outside ${toPosixPath(commandsRoot)}: ${scopePath}`);
    process.exitCode = 1;
    return;
  }

  const files = [];
  walkJsFiles(scopePath, files);
  files.sort((a, b) => toPosixPath(a).localeCompare(toPosixPath(b)));

  const commands = files.map(auditFile);
  const collisionTokenCount = attachCollisions(commands);
  for (const command of commands) recomputeIssueCount(command);

  const totals = summarizeTotals(commands, collisionTokenCount);
  const grouped = groupByCategory(commands);
  const report = {
    scope: toPosixPath(scopePath),
    commandsRoot: toPosixPath(commandsRoot),
    skippedCategories: Array.from(SKIPPED_CATEGORIES),
    totals,
    commands,
    categories: grouped,
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  printConsoleReport(grouped, totals, scopePath);
}

main();
