'use strict';

const { ChannelType } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'slowmode',
  aliases    : ['slow', 'sm'],
  description: 'Slowmode rapide en secondes (0 = désactive, max 21600 = 6h).',
  usage      : ';slowmode <0-21600> [#salon]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageChannels'],

  async execute(message, args) {
    const seconds = parseInt(args[0], 10);
    if (Number.isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply({ embeds: [E.error('Usage', '`;slowmode <0-21600>` (secondes)')] });
    }

    const channel = message.mentions.channels.first() || message.channel;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return message.reply({ embeds: [E.error('Type invalide', 'Seuls les salons textuels.')] });
    }

    try {
      await channel.setRateLimitPerUser(seconds, `[slowmode by ${message.author.tag}]`);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur', err.message)] });
    }

    return message.reply({
      embeds: [
        E.success('Slowmode mis à jour')
          .setDescription(seconds === 0 ? `${channel} : slowmode désactivé.` : `${channel} : **${seconds}s** entre messages.`),
      ],
    });
  },
};
