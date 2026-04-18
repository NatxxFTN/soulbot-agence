'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const STMT_GET = db.prepare('SELECT value FROM bot_config WHERE key = ?');
const STMT_SET = db.prepare('INSERT OR REPLACE INTO bot_config (key, value) VALUES (?, ?)');

module.exports = {
  name       : 'footer',
  aliases    : [],
  description: 'Modifie le texte du footer affiché sur tous les embeds du bot.',
  usage      : ';footer <texte> | ;footer reset',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      if (!args.length) {
        const row  = STMT_GET.get('embed_footer');
        const current = row?.value ?? '+help pour la liste des commandes';
        return message.channel.send({
          embeds: [E.base().setTitle('Footer actuel').setDescription(`\`${current}\``)],
        });
      }

      if (args[0]?.toLowerCase() === 'reset') {
        STMT_SET.run('embed_footer', '+help pour la liste des commandes');
        return message.channel.send({
          embeds: [E.success('Footer réinitialisé', 'Valeur par défaut restaurée.')],
        });
      }

      const text = args.join(' ').slice(0, 2048);
      STMT_SET.run('embed_footer', text);

      return message.channel.send({
        embeds: [E.success('Footer mis à jour', `Nouveau footer : \`${text}\``)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
