'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getConfig, formatMessage } = require('../../core/greeting-helper');
const { e } = require('../../core/emojis');

module.exports = {
  name       : 'testgreet',
  aliases    : ['testwelcome', 'greettest'],
  description: 'Tester l\'affichage des messages greeting avec toi en exemple.',
  usage      : ';testgreet',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const cfg = getConfig(message.guild.id);

    const joinPreview  = cfg?.join_message  ? formatMessage(cfg.join_message,  message.member) : '*aucun message configuré*';
    const leavePreview = cfg?.leave_message ? formatMessage(cfg.leave_message, message.member) : '*aucun message configuré*';

    const joinStatus  = cfg?.join_enabled  ? `✓ <#${cfg.join_channel_id}>`  : '✗ Désactivé';
    const leaveStatus = cfg?.leave_enabled ? `✓ <#${cfg.leave_channel_id}>` : '✗ Désactivé';

    return message.channel.send({
      embeds: [
        E.base()
          .setTitle(`${e('cat_greeting')} Aperçu des messages Greeting`)
          .addFields(
            { name: '🟢 Arrivée — salon',    value: joinStatus,   inline: true },
            { name: '🔴 Départ — salon',     value: leaveStatus,  inline: true },
            { name: '\u200B',               value: '\u200B',      inline: true },
            { name: '🟢 Aperçu arrivée',    value: joinPreview  },
            { name: '🔴 Aperçu départ',     value: leavePreview },
          ),
      ],
    });
  },
};
