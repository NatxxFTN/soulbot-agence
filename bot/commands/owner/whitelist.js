'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_whitelist (
    user_id    TEXT    PRIMARY KEY,
    added_by   TEXT    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

const STMT_ADD   = db.prepare('INSERT OR IGNORE INTO bot_whitelist (user_id, added_by) VALUES (?, ?)');
const STMT_REMOVE = db.prepare('DELETE FROM bot_whitelist WHERE user_id = ?');
const STMT_CHECK  = db.prepare('SELECT 1 FROM bot_whitelist WHERE user_id = ?');
const STMT_LIST   = db.prepare('SELECT * FROM bot_whitelist ORDER BY created_at DESC LIMIT 20');

module.exports = {
  name       : 'globalwhitelist',
  aliases    : ['gwl'],
  description: 'Gère la whitelist globale du bot (bypass des restrictions).',
  usage      : ';globalwhitelist <add|remove|list> [@membre/id]',
  cooldown   : 3,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        const rows = STMT_LIST.all();
        if (!rows.length) return message.channel.send({ embeds: [E.info('Whitelist', 'Aucun utilisateur en whitelist.')] });
        const lines = rows.map(r => `<@${r.user_id}> — ajouté <t:${r.created_at}:R>`).join('\n');
        return message.channel.send({
          embeds: [E.base().setTitle(`Whitelist (${rows.length})`).setDescription(lines)],
        });
      }

      const target = message.mentions.users.first();
      const userId = target?.id ?? args[1]?.replace(/\D/g, '');
      if (!userId) return message.reply({ embeds: [E.usage(';', 'whitelist <add|remove|list> [@membre/id]')] });

      if (sub === 'add') {
        if (STMT_CHECK.get(userId)) {
          return message.reply({ embeds: [E.warning('Déjà whitelisté', `<@${userId}> est déjà dans la whitelist.`)] });
        }
        STMT_ADD.run(userId, message.author.id);
        return message.channel.send({
          embeds: [E.success('Whitelist — Ajout', `<@${userId}> a été ajouté à la whitelist.`)],
        });
      }

      if (sub === 'remove') {
        if (!STMT_CHECK.get(userId)) {
          return message.reply({ embeds: [E.error('Non trouvé', `<@${userId}> n'est pas dans la whitelist.`)] });
        }
        STMT_REMOVE.run(userId);
        return message.channel.send({
          embeds: [E.success('Whitelist — Retrait', `<@${userId}> a été retiré de la whitelist.`)],
        });
      }

      return message.reply({ embeds: [E.usage(';', 'whitelist <add|remove|list> [@membre/id]')] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
