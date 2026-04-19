'use strict';

const { ActivityType } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'watch',
  aliases    : [],
  description: 'Définit le statut "Regarde…" du bot.',
  usage      : ';watch <activité> | ;watch off',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      if (!args.length || args[0]?.toLowerCase() === 'off') {
        client.user.setActivity(null);
        return message.channel.send({ embeds: [E.success('Statut retiré', 'Le statut "Regarde" a été supprimé.')] });
      }

      const name = args.join(' ').slice(0, 128);
      client.user.setActivity({ name, type: ActivityType.Watching });

      return message.channel.send({ embeds: [E.success('Statut mis à jour', `Regarde **${name}**`)] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
