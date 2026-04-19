'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LOG = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'derank',
  aliases    : ['dr', 'striprank'],
  description: 'Retirer tous les rôles d\'un membre (hors @everyone).',
  usage      : ';derank @membre [raison]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre à derankifier.')] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission de gérer les rôles.')] });
    }

    const botMember = message.guild.members.me;
    const removable = target.roles.cache.filter(
      r => r.id !== message.guild.id && r.position < botMember.roles.highest.position
    );

    if (!removable.size) {
      return message.reply({ embeds: [E.warning('Aucun rôle supprimable', 'Ce membre n\'a aucun rôle que je peux retirer.')] });
    }

    const reason = (args.slice(1).join(' ') || 'Aucune raison fournie').slice(0, 512);
    const roleNames = removable.map(r => r.name).join(', ');

    try {
      await target.roles.remove([...removable.keys()], reason);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur API', `Impossible de retirer les rôles : ${err.message}`)] });
    }

    STMT_LOG.run(message.guild.id, 'DERANK', target.id, target.user.tag, message.author.id, message.author.tag, reason);

    return message.channel.send({
      embeds: [
        E.success('Rôles retirés')
          .addFields(
            { name: 'Membre',          value: `${target.user.tag} (\`${target.id}\`)`, inline: true },
            { name: 'Rôles supprimés', value: `${removable.size}`,                     inline: true },
            { name: 'Modérateur',      value: message.author.tag,                      inline: true },
            { name: 'Rôles',           value: roleNames.slice(0, 1024) },
            { name: 'Raison',          value: reason },
          ),
      ],
    });
  },
};
