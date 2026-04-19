'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LOG = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'addrole',
  aliases    : ['ar', 'giverole'],
  description: 'Attribuer un rôle à un membre du serveur.',
  usage      : ';addrole @membre @rôle [raison]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre puis un rôle.')] });

    const role = message.mentions.roles.first();
    if (!role) return message.reply({ embeds: [E.error('Rôle manquant', 'Mentionne le rôle à attribuer après le membre.')] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission de gérer les rôles.')] });
    }

    const botMember = message.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return message.reply({ embeds: [E.error('Hiérarchie insuffisante', 'Ce rôle est supérieur ou égal au mien — impossible de l\'attribuer.')] });
    }

    if (target.roles.cache.has(role.id)) {
      return message.reply({ embeds: [E.warning('Déjà attribué', `${target} possède déjà le rôle **${role.name}**.`)] });
    }

    const reason = (args.slice(2).join(' ') || 'Aucune raison fournie').slice(0, 512);

    try {
      await target.roles.add(role, reason);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur API', `Impossible d\'attribuer le rôle : ${err.message}`)] });
    }

    STMT_LOG.run(message.guild.id, 'ADDROLE', target.id, target.user.tag, message.author.id, message.author.tag, `Rôle: ${role.name} — ${reason}`);

    return message.channel.send({
      embeds: [
        E.success('Rôle attribué')
          .addFields(
            { name: 'Membre',     value: `${target.user.tag} (\`${target.id}\`)`, inline: true },
            { name: 'Rôle',       value: role.toString(),                          inline: true },
            { name: 'Modérateur', value: message.author.tag,                       inline: true },
            { name: 'Raison',     value: reason },
          ),
      ],
    });
  },
};
