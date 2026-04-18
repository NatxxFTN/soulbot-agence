'use strict';

const { ActivityType } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'competing',
  aliases    : [],
  description: 'Définit le statut "En compétition dans…" du bot.',
  usage      : ';competing <nom> | ;competing off',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      if (!args.length || args[0]?.toLowerCase() === 'off') {
        client.user.setActivity(null);
        return message.channel.send({
          embeds: [E.success('Statut réinitialisé', 'Le statut "En compétition" a été retiré.')],
        });
      }

      const name = args.join(' ').slice(0, 128);
      client.user.setActivity({ name, type: ActivityType.Competing });

      return message.channel.send({
        embeds: [E.success('Statut mis à jour', `En compétition dans **${name}**`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
