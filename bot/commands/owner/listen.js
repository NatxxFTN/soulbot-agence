'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS listen_channels (
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    target_id  TEXT,
    added_by   TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, channel_id)
  );
`);

const STMT_ADD    = db.prepare('INSERT OR IGNORE INTO listen_channels (guild_id, channel_id, target_id, added_by) VALUES (?, ?, ?, ?)');
const STMT_REMOVE = db.prepare('DELETE FROM listen_channels WHERE guild_id = ? AND channel_id = ?');
const STMT_LIST   = db.prepare('SELECT * FROM listen_channels WHERE guild_id = ?');

module.exports = {
  name       : 'listen',
  aliases    : [],
  description: 'Active ou désactive l\'écoute (log) d\'un salon vers les logs owner.',
  usage      : ';listen <add|remove|list> [#salon] [@user]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        const rows = STMT_LIST.all(message.guild.id);
        if (!rows.length) return message.channel.send({ embeds: [E.info('Écoute', 'Aucun salon en écoute.')] });
        const lines = rows.map(r => `<#${r.channel_id}>${r.target_id ? ` → <@${r.target_id}>` : ''}`).join('\n');
        return message.channel.send({ embeds: [E.base().setTitle(`Salons écoutés (${rows.length})`).setDescription(lines)] });
      }

      const channel = message.mentions.channels.first();
      if (!channel) return message.reply({ embeds: [E.usage(';', 'listen <add|remove|list> [#salon] [@user]')] });

      if (sub === 'remove') {
        STMT_REMOVE.run(message.guild.id, channel.id);
        return message.channel.send({ embeds: [E.success('Écoute retirée', `<#${channel.id}> n'est plus écouté.`)] });
      }

      if (sub === 'add') {
        const targetUser = message.mentions.users.first();
        STMT_ADD.run(message.guild.id, channel.id, targetUser?.id ?? null, message.author.id);
        const desc = targetUser ? `<#${channel.id}> — filtre sur <@${targetUser.id}>` : `<#${channel.id}> — tous les messages`;
        return message.channel.send({ embeds: [E.success('Écoute activée', desc)] });
      }

      return message.reply({ embeds: [E.usage(';', 'listen <add|remove|list> [#salon] [@user]')] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
