'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_GET    = db.prepare('SELECT * FROM guild_bot_perms WHERE guild_id = ? AND target_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO guild_bot_perms (guild_id, target_id, target_type, commands)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(guild_id, target_id) DO UPDATE SET commands = excluded.commands
`);

module.exports = {
  name       : 'duperm',
  aliases    : [],
  description: 'Copie les permissions custom d\'un rôle/user vers un autre.',
  usage      : ';duperm <@source> <@cible>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const roles = [...message.mentions.roles.values()];
      const users = [...message.mentions.users.values()];
      const all   = [...roles.map(r => ({ id: r.id, type: 'role', tag: `<@&${r.id}>` })),
                     ...users.map(u => ({ id: u.id, type: 'user', tag: `<@${u.id}>`  }))];

      if (all.length < 2) {
        return message.reply({ embeds: [E.usage(';', 'duperm <@source> <@cible>')] });
      }

      const [source, dest] = all;
      const row = STMT_GET.get(message.guild.id, source.id);

      if (!row || row.commands === '[]') {
        return message.reply({ embeds: [E.error('Aucune permission', `${source.tag} n'a aucune permission custom à copier.`)] });
      }

      STMT_UPSERT.run(message.guild.id, dest.id, dest.type, row.commands);

      const cmds = JSON.parse(row.commands);
      return message.channel.send({
        embeds: [
          E.success('Permissions dupliquées')
            .addFields(
              { name: 'Source',     value: source.tag,              inline: true },
              { name: 'Cible',      value: dest.tag,                inline: true },
              { name: 'Commandes',  value: cmds.map(c => `\`${c}\``).join(', ') || 'aucune' },
            ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
