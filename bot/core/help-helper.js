'use strict';

const fs   = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, '../commands');

const CATEGORY_EMOJIS = {
  'Greeting':      '🔔',
  'Ticket':        '🎟️',
  'Protection':    '🛡️',
  'Moderation':    '🔨',
  'Modération':    '🔨',
  'Owner':         '👑',
  'Level':         '📈',
  'Niveau':        '📈',
  'Custom':        '🎨',
  'Utility':       '🔧',
  'Utile':         '🔧',
  'Information':   'ℹ️',
  'Info':          'ℹ️',
  'Fun':           '🎮',
  'Game':          '🎲',
  'Stats':         '📊',
  'Invitation':    '📨',
  'Role':          '🏷️',
  'Configuration': '⚙️',
  'Giveaway':      '🎁',
};

function getCategoryEmoji(cat) {
  return CATEGORY_EMOJIS[cat] || '📁';
}

/**
 * Scan récursif de commands/ groupé par catégorie.
 * Re-require désactivé intentionnellement — on lit depuis le cache pour perf.
 */
function scanCommands() {
  const categories = {};
  if (!fs.existsSync(COMMANDS_DIR)) return categories;

  const folders = fs.readdirSync(COMMANDS_DIR).filter(f => {
    try { return fs.statSync(path.join(COMMANDS_DIR, f)).isDirectory(); } catch { return false; }
  });

  for (const folder of folders) {
    const folderPath = path.join(COMMANDS_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

    const commands = [];
    for (const file of files) {
      try {
        const cmd = require(path.join(folderPath, file));
        if (cmd?.name && typeof cmd.execute === 'function') {
          commands.push({
            name      : cmd.name,
            aliases   : Array.isArray(cmd.aliases) ? cmd.aliases : [],
            description: cmd.description || 'Aucune description.',
            usage     : cmd.usage || `;${cmd.name}`,
            ownerOnly : !!cmd.ownerOnly,
            category  : folder,
          });
        }
      } catch { /* fichier invalide, ignoré */ }
    }

    if (commands.length > 0) {
      const label = folder.charAt(0).toUpperCase() + folder.slice(1);
      categories[label] = commands.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return categories;
}

/** Cherche une commande par nom ou alias dans toutes les catégories. */
function findCommand(name) {
  const lc = name.toLowerCase();
  const cats = scanCommands();
  for (const cmds of Object.values(cats)) {
    const found = cmds.find(c => c.name === lc || c.aliases.includes(lc));
    if (found) return found;
  }
  return null;
}

module.exports = { scanCommands, findCommand, getCategoryEmoji };
