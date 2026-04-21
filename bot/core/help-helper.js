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
  'Statistique':   '📊',
  'Statistiques':  '📊',
  'Invitation':    '📨',
  'Role':          '🏷️',
  'Rôle':          '🏷️',
  'Configuration': '⚙️',
  'Config':        '⚙️',
  'Giveaway':      '🎁',
  'Automod':       '🤖',
  'Welcomer':      '👋',
  'Logs':          '📋',
};

const CATEGORY_ANSI = {
  'Owner':         33,
  'Moderation':    31,
  'Modération':    31,
  'Information':   36,
  'Info':          36,
  'Utility':       32,
  'Utile':         32,
  'Configuration': 34,
  'Config':        34,
  'Protection':    35,
  'Fun':           35,
  'Stats':         37,
  'Statistique':   37,
  'Statistiques':  37,
  'Ticket':        36,
  'Game':          32,
  'Games':         32,
  'Giveaway':      33,
  'Greeting':      33,
  'Welcomer':      33,
  'Level':         34,
  'Niveau':        34,
  'Niveaux':       34,
  'Economy':       32,
  'Économie':      32,
  'Custom':        35,
  'Role':          33,
  'Roles':         33,
  'Rôle':          33,
  'Invitation':    36,
  'Logs':          37,
  'Automod':       31,
};

function getCategoryEmoji(cat) {
  return CATEGORY_EMOJIS[cat] || '📁';
}

function getCategoryAnsi(cat) {
  return CATEGORY_ANSI[cat] ?? 37;
}

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

function findCommand(name) {
  const lc = name.toLowerCase();
  const cats = scanCommands();
  for (const cmds of Object.values(cats)) {
    const found = cmds.find(c => c.name === lc || c.aliases.includes(lc));
    if (found) return found;
  }
  return null;
}

module.exports = { scanCommands, findCommand, getCategoryEmoji, getCategoryAnsi };
