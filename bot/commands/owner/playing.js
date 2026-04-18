'use strict';

const { ActivityType } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'playing',
  aliases    : [],
  description: 'Définit le statut "En train de jouer à…" du bot.',
  usage      : ';playing <nom> | ;playing off',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      if (!args.length || args[0]?.toLowerCase() === 'off') {
        client.user.setActivity(null);
        return message.channel.send({ embeds: [E.success('Statut retiré', 'Le statut de jeu a été supprimé.')] });
      }

      const name = args.join(' ').slice(0, 128);
      client.user.setActivity({ name, type: ActivityType.Playing });

      return message.channel.send({ embeds: [E.success('Statut mis à jour', `En train de jouer à **${name}**`)] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
