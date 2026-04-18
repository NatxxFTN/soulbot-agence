'use strict';

const fs   = require('fs');
const path = require('path');
const E    = require('../../utils/embeds');
const { db } = require('../../database');

const DB_PATH      = path.join(__dirname, '../../../data/bot.db');
const BACKUP_DIR   = path.join(__dirname, '../../../data/backups');

module.exports = {
  name       : 'backup',
  aliases    : [],
  description: 'Lance une sauvegarde manuelle immédiate de la base de données.',
  usage      : ';backup',
  cooldown   : 30,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message) {
    try {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

      const stamp    = new Date().toISOString().replace(/[:.]/g, '-');
      const destPath = path.join(BACKUP_DIR, `bot_${stamp}.db`);

      db.backup(destPath);

      const stats    = fs.statSync(destPath);
      const sizeKb   = (stats.size / 1024).toFixed(1);

      const files    = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.db'))
        .sort()
        .reverse();

      return message.channel.send({
        embeds: [
          E.success('Sauvegarde effectuée')
            .addFields(
              { name: 'Fichier',  value: `\`${path.basename(destPath)}\``, inline: true },
              { name: 'Taille',   value: `${sizeKb} KB`,                   inline: true },
              { name: 'Copies',   value: `${files.length} sauvegarde(s)`,  inline: true },
            ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Sauvegarde échouée', err.message)] });
    }
  },
};
