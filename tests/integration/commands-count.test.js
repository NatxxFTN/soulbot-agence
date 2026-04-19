'use strict';

const { describe, it, before } = require('node:test');
const assert                   = require('node:assert/strict');
const fs                       = require('fs');
const path                     = require('path');

const COMMANDS_ROOT = path.join(__dirname, '../../bot/commands');

function scanCommandFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      results.push(...scanCommandFiles(full));
    } else if (entry.endsWith('.js') && !entry.startsWith('_')) {
      results.push(full);
    }
  }
  return results;
}

describe('Commandes — Cohérence compteur', () => {
  let commandFiles;
  let loadErrors;
  let loadedNames;

  before(() => {
    commandFiles = scanCommandFiles(COMMANDS_ROOT);
    loadErrors   = [];
    loadedNames  = new Map(); // name → filePath

    for (const filePath of commandFiles) {
      try {
        delete require.cache[require.resolve(filePath)];
        const cmd = require(filePath);
        if (cmd?.name && typeof cmd.execute === 'function') {
          loadedNames.set(cmd.name.toLowerCase(), filePath);
        }
      } catch (err) {
        loadErrors.push({ file: filePath, error: err.message });
      }
    }
  });

  it('Aucun fichier de commande ne provoque une erreur au chargement', () => {
    if (loadErrors.length) {
      const detail = loadErrors
        .map(e => `  - ${path.relative(COMMANDS_ROOT, e.file)}: ${e.error}`)
        .join('\n');
      assert.fail(`${loadErrors.length} fichier(s) en erreur :\n${detail}`);
    }
  });

  it('Aucun doublon de nom de commande', () => {
    const seen  = new Map();
    const dupes = [];

    for (const filePath of commandFiles) {
      try {
        const cmd = require(filePath);
        if (!cmd?.name) continue;
        const n = cmd.name.toLowerCase();
        if (seen.has(n)) {
          dupes.push(`"${n}" dans ${path.relative(COMMANDS_ROOT, filePath)} ET ${path.relative(COMMANDS_ROOT, seen.get(n))}`);
        } else {
          seen.set(n, filePath);
        }
      } catch { /* déjà signalé */ }
    }

    if (dupes.length) {
      assert.fail(`Doublons détectés :\n${dupes.map(d => `  - ${d}`).join('\n')}`);
    }
  });

  it('Chaque fichier .js a un champ "name" et une fonction "execute"', () => {
    const invalid = [];
    for (const filePath of commandFiles) {
      try {
        const cmd = require(filePath);
        if (!cmd?.name || typeof cmd.execute !== 'function') {
          invalid.push(path.relative(COMMANDS_ROOT, filePath));
        }
      } catch { /* déjà signalé */ }
    }
    if (invalid.length) {
      assert.fail(`Fichiers sans name/execute :\n${invalid.map(f => `  - ${f}`).join('\n')}`);
    }
  });

  it('Le nombre de commandes valides correspond aux fichiers chargés', () => {
    const validCount = commandFiles.filter(f => {
      try { const c = require(f); return c?.name && typeof c.execute === 'function'; }
      catch { return false; }
    }).length;
    assert.strictEqual(loadedNames.size, validCount);
  });
});
