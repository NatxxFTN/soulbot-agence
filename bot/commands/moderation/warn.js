'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_MOD_LOG = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const STMT_WARN = db.prepare(
  'INSERT INTO warnings (guild_id, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?)'
);
const STMT_COUNT = db.prepare(
  'SELECT COUNT(*) AS count FROM warnings WHERE guild_id = ? AND user_id = ?'
);

module.exports = {
  name       : 'warn',
  aliases    : ['avertir'],
  description: 'Émettre un avertissement formel contre un membre.',
  usage      : ';warn @membre [raison]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ModerateMembers'],

  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre à avertir.')] });
    if (target.user.bot) return message.reply({ embeds: [E.error('Action impossible', 'On ne peut pas avertir un bot.')] });

    const reason = (args.slice(1).join(' ') || 'Aucune raison fournie').slice(0, 512);

    try {
      STMT_WARN.run(message.guild.id, target.id, target.user.tag, message.author.id, message.author.tag, reason);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur DB', 'Impossible d\'enregistrer l\'avertissement.')] });
    }

    const { count } = STMT_COUNT.get(message.guild.id, target.id);
    STMT_MOD_LOG.run(message.guild.id, 'WARN', target.id, target.user.tag, message.author.id, message.author.tag, reason);

    target.send(`⚠️ Tu as reçu un avertissement sur **${message.guild.name}**.\nRaison : ${reason}\nTotal : **${count}** avertissement(s)`).catch(() => {});

    return message.channel.send({
      embeds: [
        E.warning('Avertissement', `**${target.user.tag}** — avertissement #${count}`)
          .addFields(
            { name: 'Modérateur', value: message.author.tag, inline: true },
            { name: 'Raison', value: reason },
          ),
      ],
    });
  },
};
