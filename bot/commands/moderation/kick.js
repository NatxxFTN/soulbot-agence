'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');
const L = require('../../core/logs-helper');

const STMT = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'kick',
  aliases    : ['expulser'],
  description: 'Expulser un membre du serveur.',
  usage      : ';kick @membre [raison]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['KickMembers'],

  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre à expulser.')] });
    if (!target.kickable) return message.reply({ embeds: [E.error('Action impossible', 'Je ne peux pas expulser ce membre (hiérarchie des rôles).')] });

    const reason = (args.slice(1).join(' ') || 'Aucune raison fournie').slice(0, 512);

    try {
      await target.kick(reason);
    } catch (err) {
      if (err.code === 50013) return message.reply({ embeds: [E.error('Permission insuffisante', 'Hiérarchie de rôles : je ne peux pas expulser ce membre.')] });
      return message.reply({ embeds: [E.error('Erreur API', `Impossible d'expulser : ${err.message}`)] });
    }

    STMT.run(message.guild.id, 'KICK', target.id, target.user.tag, message.author.id, message.author.tag, reason);

    // ── Hook Logs V2 — emit member_kick (ne bloque pas la commande) ──────────
    L.log(message.guild, 'member_kick', {
      description: `${target.user.tag} a été expulsé du serveur.`,
      fields: [
        { name: 'Membre',     value: `${target.user.tag} (\`${target.id}\`)`, inline: true },
        { name: 'Modérateur', value: message.author.tag,                       inline: true },
        { name: 'Raison',     value: reason,                                   inline: false },
      ],
      summary: `${target.user.tag} expulsé par ${message.author.tag}`,
    }).catch(() => {});

    return message.channel.send({
      embeds: [
        E.base()
          .setTitle('Modération — Kick')
          .addFields(
            { name: 'Membre', value: `${target.user.tag} (\`${target.id}\`)`, inline: true },
            { name: 'Modérateur', value: message.author.tag, inline: true },
            { name: 'Raison', value: reason },
          ),
      ],
    });
  },
};
