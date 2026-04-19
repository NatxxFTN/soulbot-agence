'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getConfig } = require('../../core/greeting-helper');

module.exports = {
  name       : 'greeting',
  aliases    : ['greet', 'welcomeconfig'],
  description: 'Affiche la configuration du système de bienvenue/départ.',
  usage      : ';greeting',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const cfg = getConfig(message.guild.id);

    const joinStatus  = cfg?.join_enabled  ? `✓ <#${cfg.join_channel_id}>`  : '✗ Désactivé';
    const leaveStatus = cfg?.leave_enabled ? `✓ <#${cfg.leave_channel_id}>` : '✗ Désactivé';

    return message.channel.send({
      embeds: [
        E.base()
          .setTitle('👋 Configuration Greeting')
          .addFields(
            { name: 'Arrivée',         value: joinStatus,                                    inline: true },
            { name: 'Départ',          value: leaveStatus,                                   inline: true },
            { name: '\u200B',          value: '\u200B',                                      inline: true },
            { name: 'Message arrivée', value: cfg?.join_message  ?? '*défaut*' },
            { name: 'Message départ',  value: cfg?.leave_message ?? '*défaut*' },
            { name: 'Variables',       value: '`{user}` · `{username}` · `{server}` · `{count}`' },
            { name: 'Commandes',       value: '`;joiner #salon` · `;leaver #salon` · `;setwelcome <msg>` · `;testgreet`' },
          ),
      ],
    });
  },
};
