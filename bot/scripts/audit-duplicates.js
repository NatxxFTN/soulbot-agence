#!/usr/bin/env node
'use strict';

// audit-duplicates.js — Détecte les collisions de name/aliases entre
// commandes Soulbot, ainsi que les commandes fantômes et templates oubliés.
//
// POURQUOI ce script : sans audit, le CommandHandler de Soulbot écrase
// silencieusement les commandes en cas de conflit (last loaded wins). On a
// déjà perdu le ;help V2 dans le commit 72ab525 à cause de ça. Ce script
// scanne EXACTEMENT ce que charge CommandHandler.js (cf. core/CommandHandler.js
// ligne 62-103) et flagge :
//   - 2 commandes avec le même name
//   - 2 commandes avec le même alias
//   - alias d'une cmd identique au name d'une autre
//   - fichiers .js sans module.exports.name (fantômes — ignorés au load)
//   - _template.js placé dans une catégorie (chargé par erreur)
//
// Exit code 0 si tout est propre, 1 sinon (utile en pre-commit hook).

const fs   = require('fs');
const path = require('path');

let chalk;
try {
  chalk = require('chalk');
} catch {
  // Fallback no-color si chalk indisponible (tooling).
  chalk = new Proxy({}, { get: () => (s) => s });
}

const COMMANDS_ROOT = path.join(__dirname, '../commands');

// ─── Walk : reproduit fidèlement la logique de CommandHandler.js ────────────

/**
 * @returns {Array<{file: string, category: string}>}
 */
function listCommandFiles() {
  const result = [];
  if (!fs.existsSync(COMMANDS_ROOT)) return result;

  for (const entry of fs.readdirSync(COMMANDS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue; // CommandHandler skip les fichiers à la racine
    const catPath = path.join(COMMANDS_ROOT, entry.name);
    for (const f of fs.readdirSync(catPath)) {
      if (!f.endsWith('.js')) continue;
      result.push({ file: path.join(catPath, f), category: entry.name });
    }
  }
  return result;
}

// ─── Loader robuste : si un module crash au require, on le note et on continue ─

function safeLoad(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    return { ok: true, mod: require(filePath) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Collecte ──────────────────────────────────────────────────────────────────

function collect(files) {
  // tokenRegistry : "token canonique" → [{ file, category, role: 'name'|'alias', cmdName }]
  // Un token = name OU alias. On les met dans le même registre pour détecter
  // les cross-collisions (alias d'une cmd = name d'une autre).
  const tokens = new Map();
  const ghosts = [];        // fichiers sans name
  const templates = [];     // _template.js dans une catégorie
  const loadFails = [];     // require crash
  let okCount = 0;

  for (const { file, category } of files) {
    const relFile = path.relative(process.cwd(), file).replace(/\\/g, '/');

    if (path.basename(file).startsWith('_template')) {
      templates.push({ file: relFile, category });
      // On ne load PAS le template — il est généralement squelette syntaxique.
      continue;
    }

    const loaded = safeLoad(file);
    if (!loaded.ok) {
      loadFails.push({ file: relFile, category, error: loaded.error });
      continue;
    }
    const cmd = loaded.mod;

    if (!cmd || typeof cmd !== 'object' || !cmd.name) {
      ghosts.push({ file: relFile, category });
      continue;
    }

    okCount++;

    const cmdName = String(cmd.name).toLowerCase();
    const addToken = (token, role) => {
      const key = String(token).toLowerCase();
      if (!tokens.has(key)) tokens.set(key, []);
      tokens.get(key).push({ file: relFile, category, role, cmdName });
    };

    addToken(cmdName, 'name');
    if (Array.isArray(cmd.aliases)) {
      for (const a of cmd.aliases) addToken(a, 'alias');
    }
  }

  return { tokens, ghosts, templates, loadFails, okCount };
}

// ─── Détection collisions ──────────────────────────────────────────────────────

function findCollisions(tokens) {
  const collisions = [];
  for (const [token, occurrences] of tokens) {
    if (occurrences.length < 2) continue;

    // Plusieurs sous-cas qu'on veut différencier dans le rapport :
    //  - 2× role=name              → "DUPLICATE NAME"
    //  - 2× role=alias              → "DUPLICATE ALIAS"
    //  - 1× name + 1× alias        → "NAME vs ALIAS"
    //  - 1× alias dans la même cmd  → faux positif (une cmd s'auto-référence
    //    si name === alias dans son propre array — cas pathologique mais
    //    techniquement possible si on a dupliqué)
    const names   = occurrences.filter(o => o.role === 'name');
    const aliases = occurrences.filter(o => o.role === 'alias');

    // Si toutes les occurrences viennent du MÊME fichier, c'est juste une cmd
    // mal configurée (alias = son propre name) — pas une collision inter-cmds.
    const distinctFiles = new Set(occurrences.map(o => o.file));
    if (distinctFiles.size < 2) {
      collisions.push({
        token, severity: 'self', kind: 'self-reference',
        occurrences,
      });
      continue;
    }

    let kind = 'mixed';
    if (names.length >= 2 && aliases.length === 0)       kind = 'duplicate-name';
    else if (names.length === 0 && aliases.length >= 2)  kind = 'duplicate-alias';
    else if (names.length >= 1 && aliases.length >= 1)   kind = 'name-vs-alias';

    const severity = (kind === 'duplicate-name' || kind === 'name-vs-alias')
      ? 'hard'
      : 'soft';

    collisions.push({ token, severity, kind, occurrences });
  }

  // Tri : hard avant soft, puis token alpha.
  collisions.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'hard' ? -1 : 1;
    return a.token.localeCompare(b.token);
  });

  return collisions;
}

// ─── Rendu console ─────────────────────────────────────────────────────────────

function renderCollision(c) {
  const labels = {
    'duplicate-name'  : '❌ DUPLICATE NAME',
    'name-vs-alias'   : '❌ NAME vs ALIAS',
    'duplicate-alias' : '⚠️  DUPLICATE ALIAS',
    'self-reference'  : 'ℹ️  SELF-REFERENCE',
    'mixed'           : '❌ MIXED COLLISION',
  };
  const color = c.severity === 'hard' ? chalk.red.bold
              : c.severity === 'soft' ? chalk.yellow
              : chalk.gray;

  const lines = [];
  lines.push(color(`${labels[c.kind] || c.kind} : "${c.token}"`));
  for (const occ of c.occurrences) {
    const tag = occ.role === 'name' ? chalk.cyan('[name]') : chalk.magenta('[alias]');
    const cmdInfo = occ.role === 'alias' ? chalk.gray(`(belongs to ;${occ.cmdName})`) : '';
    lines.push(`   • ${occ.file} ${chalk.dim('(' + occ.category + ')')} ${tag} ${cmdInfo}`);
  }
  return lines.join('\n');
}

function main() {
  console.log(chalk.bold('\n🔍 Soulbot — Audit anti-doublons des commandes\n'));

  const files = listCommandFiles();
  const { tokens, ghosts, templates, loadFails, okCount } = collect(files);
  const collisions = findCollisions(tokens);

  // ─── Section collisions ────────────────────────────────────────────────────
  const hardCount = collisions.filter(c => c.severity === 'hard').length;
  const softCount = collisions.filter(c => c.severity === 'soft').length;

  if (collisions.length === 0) {
    console.log(chalk.green(`✅ Aucune collision détectée. ${okCount} commandes auditées.`));
  } else {
    console.log(chalk.red.bold(`❌ ${collisions.length} collision(s) détectée(s) (${hardCount} hard, ${softCount} soft) — sur ${okCount} commandes.\n`));
    for (const c of collisions) {
      console.log(renderCollision(c));
      console.log('');
    }
  }

  // ─── Bonus : fantômes ──────────────────────────────────────────────────────
  if (ghosts.length) {
    console.log(chalk.yellow.bold(`\n👻 ${ghosts.length} fichier(s) sans module.exports.name (ignorés au load) :`));
    for (const g of ghosts) console.log(`   • ${g.file} ${chalk.dim('(' + g.category + ')')}`);
  }

  // ─── Bonus : templates dans catégories ─────────────────────────────────────
  if (templates.length) {
    console.log(chalk.yellow.bold(`\n📋 ${templates.length} fichier(s) _template.js dans une catégorie (potentiellement chargé par erreur) :`));
    for (const t of templates) console.log(`   • ${t.file} ${chalk.dim('(' + t.category + ')')}`);
  }

  // ─── Erreurs de require ────────────────────────────────────────────────────
  if (loadFails.length) {
    console.log(chalk.red.bold(`\n💥 ${loadFails.length} fichier(s) impossibles à require :`));
    for (const l of loadFails) console.log(`   • ${l.file} — ${chalk.dim(l.error)}`);
  }

  // ─── Résumé final ──────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold('📊 Résumé :'));
  console.log(`   • Fichiers .js scannés    : ${files.length}`);
  console.log(`   • Commandes valides       : ${okCount}`);
  console.log(`   • Collisions HARD         : ${hardCount}`);
  console.log(`   • Collisions SOFT         : ${softCount}`);
  console.log(`   • Fantômes (sans name)    : ${ghosts.length}`);
  console.log(`   • Templates en catégorie  : ${templates.length}`);
  console.log(`   • Erreurs de require      : ${loadFails.length}`);
  console.log('');

  // Exit code : 1 si quelque chose à nettoyer (collision hard, fail require,
  // template à problème). Soft warnings ne font pas exit 1 (utile en CI :
  // les soft sont juste notifiés, hard bloquent).
  const fatal = hardCount > 0 || loadFails.length > 0 || templates.length > 0;
  process.exit(fatal ? 1 : 0);
}

main();
