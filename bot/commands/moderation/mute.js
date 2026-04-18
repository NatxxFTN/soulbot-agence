'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

module.exports = {
  name       : 'mute',
  aliases    : ['timeout', 'silence'],
  description: 'Mettre un membre en sourdine (timeout Discord natif).',
  usage      : ';mute @membre [durée ex: 10m 1h] [raison]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ModerateMembers'],

  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre à muter.')] });
    if (!target.moderatable) return message.reply({ embeds: [E.error('Action impossible', 'Je ne peux pas muter ce membre (hiérarchie).')] });

    let duration    = 10 * 60 * 1000;
    let reasonStart = 1;
    try {
      const ms = require('ms');
      if (args[1] && ms(args[1])) { duration = ms(args[1]); reasonStart = 2; }
    } catch { /* ms non installé — durée par défaut 10 min */ }

    if (duration > MAX_TIMEOUT_MS) {
      return message.reply({ embeds: [E.error('Durée excessive', 'La durée maximale est **28 jours**.')] });
    }

    const reason       = (args.slice(reasonStart).join(' ') || 'Aucune raison fournie').slice(0, 512);
    const durationLabel = `${Math.round(duration / 60000)} min`;

    await target.timeout(duration, reason);

    STMT.run(message.guild.id, 'MUTE', target.id, target.user.tag, message.author.id, message.author.tag, reason, durationLabel);

    return message.channel.send({
      embeds: [
        E.base()
          .setTitle('Modération — Mute')
          .addFields(
            { name: 'Membre', value: `${target.user.tag} (\`${target.id}\`)`, inline: true },
            { name: 'Durée', value: durationLabel, inline: true },
            { name: 'Raison', value: reason },
          ),
      ],
    });
  },
};
