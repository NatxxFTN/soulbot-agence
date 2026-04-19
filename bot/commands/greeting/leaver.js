'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { updateConfig } = require('../../core/greeting-helper');

module.exports = {
  name       : 'leaver',
  aliases    : ['goodbye', 'setleavechan'],
  description: 'Activer ou désactiver les messages de départ.',
  usage      : ';leaver #salon  ou  ;leaver off',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const arg = args[0]?.toLowerCase();

    if (arg === 'off' || arg === 'disable') {
      updateConfig(message.guild.id, { leave_enabled: 0 });
      return message.reply({ embeds: [E.success('Départs désactivés', 'Les messages de départ sont maintenant désactivés.')] });
    }

    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply({ embeds: [E.error('Salon manquant', 'Usage : `;leaver #salon` ou `;leaver off`')] });
    }

    updateConfig(message.guild.id, { leave_channel_id: channel.id, leave_enabled: 1 });

    return message.reply({
      embeds: [
        E.success('Départs activés')
          .addFields({ name: 'Salon', value: channel.toString(), inline: true }),
      ],
    });
  },
};
