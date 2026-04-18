'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'ban',
  aliases    : ['bannir'],
  description: 'Bannir définitivement un membre du serveur.',
  usage      : ';ban @membre [raison]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['BanMembers'],

  async execute(message, args) {
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission de bannir dans ce serveur.')] });
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre à bannir.')] });
    if (!target.bannable) return message.reply({ embeds: [E.error('Action impossible', 'Je ne peux pas bannir ce membre (hiérarchie des rôles).')] });

    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    await target.ban({ reason, deleteMessageSeconds: 86400 });

    STMT.run(message.guild.id, 'BAN', target.id, target.user.tag, message.author.id, message.author.tag, reason);

    return message.channel.send({
      embeds: [
        E.base()
          .setTitle('Modération — Ban')
          .addFields(
            { name: 'Membre', value: `${target.user.tag} (\`${target.id}\`)`, inline: true },
            { name: 'Modérateur', value: message.author.tag, inline: true },
            { name: 'Raison', value: reason },
          ),
      ],
    });
  },
};
