'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_blacklist (
    user_id    TEXT    PRIMARY KEY,
    added_by   TEXT    NOT NULL,
    reason     TEXT    NOT NULL DEFAULT 'Aucune raison',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

const STMT_ADD    = db.prepare('INSERT OR IGNORE INTO bot_blacklist (user_id, added_by, reason) VALUES (?, ?, ?)');
const STMT_REMOVE = db.prepare('DELETE FROM bot_blacklist WHERE user_id = ?');
const STMT_GET    = db.prepare('SELECT * FROM bot_blacklist WHERE user_id = ?');
const STMT_LIST   = db.prepare('SELECT * FROM bot_blacklist ORDER BY created_at DESC LIMIT 20');

module.exports = {
  name       : 'globalblacklist',
  aliases    : ['gbl'],
  description: 'Ajoute ou retire un utilisateur de la blacklist globale du bot.',
  usage      : ';globalblacklist <add|remove|list> [@user] [raison]',
  cooldown   : 3,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        const rows = STMT_LIST.all();
        if (!rows.length) {
          return message.channel.send({ embeds: [E.info('Blacklist', 'Aucun utilisateur blacklisté.')] });
        }
        const lines = rows.map(r => `<@${r.user_id}> — ${r.reason} *(ajouté <t:${r.created_at}:R>)*`).join('\n');
        return message.channel.send({
          embeds: [E.base().setTitle(`Blacklist globale (${rows.length})`).setDescription(lines)],
        });
      }

      const target = message.mentions.users.first();
      if (!target) {
        return message.reply({ embeds: [E.usage(';', 'blacklist <add|remove|list> [@user] [raison]')] });
      }

      if (sub === 'add') {
        const existing = STMT_GET.get(target.id);
        if (existing) {
          return message.reply({ embeds: [E.warning('Déjà blacklisté', `${target.tag} est déjà dans la blacklist.`)] });
        }
        const reason = args.slice(2).join(' ') || 'Aucune raison';
        STMT_ADD.run(target.id, message.author.id, reason);
        return message.channel.send({
          embeds: [E.success('Blacklist — Ajout', `**${target.tag}** a été blacklisté.\nRaison : ${reason}`)],
        });
      }

      if (sub === 'remove') {
        const result = STMT_REMOVE.run(target.id);
        if (!result.changes) {
          return message.reply({ embeds: [E.error('Non trouvé', `${target.tag} n'est pas dans la blacklist.`)] });
        }
        return message.channel.send({
          embeds: [E.success('Blacklist — Retrait', `**${target.tag}** a été retiré de la blacklist.`)],
        });
      }

      return message.reply({ embeds: [E.usage(';', 'blacklist <add|remove|list> [@user] [raison]')] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
