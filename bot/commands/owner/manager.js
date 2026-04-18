'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_managers (
    user_id    TEXT    PRIMARY KEY,
    added_by   TEXT    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

const STMT_ADD    = db.prepare('INSERT OR IGNORE INTO bot_managers (user_id, added_by) VALUES (?, ?)');
const STMT_REMOVE = db.prepare('DELETE FROM bot_managers WHERE user_id = ?');
const STMT_LIST   = db.prepare('SELECT * FROM bot_managers ORDER BY created_at DESC');
const STMT_CHECK  = db.prepare('SELECT 1 FROM bot_managers WHERE user_id = ?');

module.exports = {
  name       : 'manager',
  aliases    : [],
  description: 'Ajoute ou retire un manager du bot (accès étendu aux commandes owner).',
  usage      : ';manager <add|remove|list> [@user]',
  cooldown   : 3,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        const rows = STMT_LIST.all();
        if (!rows.length) return message.channel.send({ embeds: [E.info('Managers', 'Aucun manager enregistré.')] });
        const lines = rows.map(r => `<@${r.user_id}> — ajouté <t:${r.created_at}:R>`).join('\n');
        return message.channel.send({ embeds: [E.base().setTitle(`Managers du bot (${rows.length})`).setDescription(lines)] });
      }

      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [E.usage(';', 'manager <add|remove|list> [@user]')] });
      if (target.bot) return message.reply({ embeds: [E.error('Action impossible', 'Tu ne peux pas ajouter un bot comme manager.')] });

      if (sub === 'add') {
        if (STMT_CHECK.get(target.id)) {
          return message.reply({ embeds: [E.warning('Déjà manager', `${target.tag} est déjà manager.`)] });
        }
        STMT_ADD.run(target.id, message.author.id);
        return message.channel.send({ embeds: [E.success('Manager ajouté', `**${target.tag}** a maintenant accès aux commandes manager.`)] });
      }

      if (sub === 'remove') {
        const result = STMT_REMOVE.run(target.id);
        if (!result.changes) return message.reply({ embeds: [E.error('Non trouvé', `${target.tag} n'est pas manager.`)] });
        return message.channel.send({ embeds: [E.success('Manager retiré', `**${target.tag}** n'est plus manager.`)] });
      }

      return message.reply({ embeds: [E.usage(';', 'manager <add|remove|list> [@user]')] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
