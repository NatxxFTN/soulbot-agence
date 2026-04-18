'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_TARGET = db.prepare('SELECT * FROM guild_bot_perms WHERE guild_id = ? AND target_id = ?');
const STMT_ALL    = db.prepare('SELECT * FROM guild_bot_perms WHERE guild_id = ? ORDER BY target_type, target_id');

module.exports = {
  name       : 'perms',
  aliases    : [],
  description: 'Affiche les permissions de commandes custom d\'un serveur ou d\'une cible.',
  usage      : ';perms [@role|@user]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const target = message.mentions.roles.first() || message.mentions.users.first();

      if (target) {
        const row = STMT_TARGET.get(message.guild.id, target.id);
        if (!row || row.commands === '[]') {
          return message.channel.send({ embeds: [E.info('Permissions', 'Aucune permission custom pour cette cible.')] });
        }
        const cmds    = JSON.parse(row.commands);
        const mention = row.target_type === 'role' ? `<@&${target.id}>` : `<@${target.id}>`;
        return message.channel.send({
          embeds: [
            E.base()
              .setTitle('Permissions custom')
              .addFields(
                { name: 'Cible',      value: mention,                           inline: true },
                { name: 'Type',       value: row.target_type,                   inline: true },
                { name: 'Commandes',  value: cmds.map(c => `\`${c}\``).join(', ') },
              ),
          ],
        });
      }

      const rows = STMT_ALL.all(message.guild.id);
      if (!rows.length) {
        return message.channel.send({ embeds: [E.info('Permissions', 'Aucune permission custom sur ce serveur.')] });
      }

      const lines = rows.map(r => {
        const cmds    = JSON.parse(r.commands);
        const mention = r.target_type === 'role' ? `<@&${r.target_id}>` : `<@${r.target_id}>`;
        return `${mention} — ${cmds.map(c => `\`${c}\``).join(', ')}`;
      }).join('\n');

      return message.channel.send({
        embeds: [E.base().setTitle(`Permissions custom du serveur (${rows.length})`).setDescription(lines)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
