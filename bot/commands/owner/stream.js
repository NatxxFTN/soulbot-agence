'use strict';

const { ActivityType } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'stream',
  aliases    : [],
  description: 'Définit le statut "En train de streamer…" du bot.',
  usage      : ';stream <activité> [url] | ;stream off',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      if (!args.length || args[0]?.toLowerCase() === 'off') {
        client.user.setActivity(null);
        return message.channel.send({ embeds: [E.success('Statut retiré', 'Le statut de stream a été supprimé.')] });
      }

      // Dernier arg = URL si commence par http
      const lastArg = args[args.length - 1];
      const url     = lastArg.startsWith('http') ? lastArg : 'https://twitch.tv/placeholder';
      const name    = (lastArg.startsWith('http') ? args.slice(0, -1) : args).join(' ').slice(0, 128);

      if (!name) return message.reply({ embeds: [E.usage(';', 'stream <activité> [url]')] });

      client.user.setActivity({ name, url, type: ActivityType.Streaming });

      return message.channel.send({ embeds: [E.success('Statut mis à jour', `En train de streamer **${name}**`)] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
