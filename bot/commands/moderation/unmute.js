'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LOG = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'unmute',
  aliases    : ['um', 'untimeout'],
  description: 'Lever le timeout (mute) d\'un membre.',
  usage      : ';unmute @membre [raison]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ModerateMembers'],

  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre à démuter.')] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission ModerateMembers.')] });
    }

    if (!target.isCommunicationDisabled()) {
      return message.reply({ embeds: [E.warning('Pas en timeout', `${target} n\'est pas en timeout actuellement.`)] });
    }

    const reason = (args.slice(1).join(' ') || 'Aucune raison fournie').slice(0, 512);

    try {
      await target.timeout(null, reason);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur API', `Impossible de lever le timeout : ${err.message}`)] });
    }

    STMT_LOG.run(message.guild.id, 'UNMUTE', target.id, target.user.tag, message.author.id, message.author.tag, reason);

    return message.channel.send({
      embeds: [
        E.success('Timeout levé')
          .addFields(
            { name: 'Membre',     value: `${target.user.tag} (\`${target.id}\`)`, inline: true },
            { name: 'Modérateur', value: message.author.tag,                       inline: true },
            { name: 'Raison',     value: reason },
          ),
      ],
    });
  },
};
