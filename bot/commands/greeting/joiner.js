'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { updateConfig } = require('../../core/greeting-helper');

module.exports = {
  name       : 'joiner',
  aliases    : ['welcome', 'setwelcomechan'],
  description: 'Activer ou désactiver les messages d\'arrivée.',
  usage      : ';joiner #salon  ou  ;joiner off',
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
      updateConfig(message.guild.id, { join_enabled: 0 });
      return message.reply({ embeds: [E.success('Arrivées désactivées', 'Les messages d\'arrivée sont maintenant désactivés.')] });
    }

    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply({ embeds: [E.error('Salon manquant', 'Usage : `;joiner #salon` ou `;joiner off`')] });
    }

    updateConfig(message.guild.id, { join_channel_id: channel.id, join_enabled: 1 });

    return message.reply({
      embeds: [
        E.success('Arrivées activées')
          .addFields({ name: 'Salon', value: channel.toString(), inline: true }),
      ],
    });
  },
};
