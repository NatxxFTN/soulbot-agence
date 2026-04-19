'use strict';

const fs   = require('fs');
const path = require('path');

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
  let loadedCommands;
  let loadErrors;

  beforeAll(() => {
    commandFiles = scanCommandFiles(COMMANDS_ROOT);

    // Charge manuellement chaque fichier pour détecter les erreurs
    loadedCommands = new Map();
    loadErrors     = [];

    for (const filePath of commandFiles) {
      try {
        delete require.cache[require.resolve(filePath)];
        const cmd = require(filePath);
        if (cmd?.name && typeof cmd.execute === 'function') {
          loadedCommands.set(cmd.name.toLowerCase(), cmd);
        }
      } catch (err) {
        loadErrors.push({ file: filePath, error: err.message });
      }
    }
  });

  test('Aucun fichier de commande ne provoque une erreur au chargement', () => {
    if (loadErrors.length) {
      const detail = loadErrors.map(e => `  - ${path.relative(COMMANDS_ROOT, e.file)}: ${e.error}`).join('\n');
      throw new Error(`${loadErrors.length} fichier(s) en erreur :\n${detail}`);
    }
  });

  test('Aucun doublon de nom de commande (pas d\'écrasement silencieux)', () => {
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
      } catch {
        // erreur déjà signalée dans le test précédent
      }
    }

    if (dupes.length) {
      throw new Error(`Doublons détectés :\n${dupes.map(d => `  - ${d}`).join('\n')}`);
    }
  });

  test('Chaque commande a un champ "name" et une fonction "execute"', () => {
    const invalid = [];
    for (const filePath of commandFiles) {
      try {
        const cmd = require(filePath);
        if (!cmd?.name || typeof cmd.execute !== 'function') {
          invalid.push(path.relative(COMMANDS_ROOT, filePath));
        }
      } catch {
        // déjà signalé
      }
    }
    if (invalid.length) {
      throw new Error(`Fichiers sans name/execute :\n${invalid.map(f => `  - ${f}`).join('\n')}`);
    }
  });

  test('Le nombre de commandes chargées correspond aux fichiers valides', () => {
    // commandFiles peut inclure des fichiers sans name/execute → ils ne comptent pas
    const validFiles = commandFiles.filter(f => {
      try { const c = require(f); return c?.name && typeof c.execute === 'function'; }
      catch { return false; }
    });
    expect(loadedCommands.size).toBe(validFiles.length);
  });
});
