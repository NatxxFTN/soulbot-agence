'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LOG = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'nickname',
  aliases    : ['setnick'],
  description: 'Modifier ou réinitialiser le pseudo d\'un membre.',
  usage      : ';nickname @membre [nouveau pseudo] — sans pseudo = réinitialise',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageNicknames'],

  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre.')] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission de modifier les pseudos.')] });
    }

    const botMember = message.guild.members.me;
    if (target.roles.highest.position >= botMember.roles.highest.position && target.id !== message.guild.ownerId) {
      return message.reply({ embeds: [E.error('Hiérarchie insuffisante', 'Ce membre est au-dessus ou au même niveau que moi.')] });
    }

    const newNick = args.slice(1).join(' ').slice(0, 32) || null;
    const oldNick = target.nickname ?? target.user.username;

    try {
      await target.setNickname(newNick, `Par ${message.author.tag}`);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur API', `Impossible de modifier le pseudo : ${err.message}`)] });
    }

    STMT_LOG.run(message.guild.id, 'NICKNAME', target.id, target.user.tag, message.author.id, message.author.tag, `${oldNick} → ${newNick ?? 'réinitialisé'}`);

    const desc = newNick
      ? `Pseudo de ${target} changé en **${newNick}**.`
      : `Pseudo de ${target} réinitialisé.`;

    return message.channel.send({
      embeds: [
        E.success('Pseudo modifié', desc)
          .addFields(
            { name: 'Ancien pseudo', value: oldNick,                     inline: true },
            { name: 'Nouveau pseudo', value: newNick ?? target.user.username, inline: true },
            { name: 'Modérateur',    value: message.author.tag,          inline: true },
          ),
      ],
    });
  },
};
