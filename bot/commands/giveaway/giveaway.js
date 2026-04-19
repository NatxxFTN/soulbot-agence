'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'giveaway',
  aliases    : ['gw', 'ghelp'],
  description: 'Affiche l\'aide du système de giveaway.',
  usage      : ';giveaway',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    return message.channel.send({
      embeds: [
        E.base()
          .setTitle('🎁 Système de Giveaway')
          .setDescription('Crée et gère des tirages au sort sur ton serveur.')
          .addFields(
            { name: '`;gcreate #salon <durée> <gain>`', value: 'Créer un giveaway avec timer automatique.' },
            { name: '`;gend <id>`',                     value: 'Terminer immédiatement un giveaway + tirage.' },
            { name: '`;gparticipants <id>`',            value: 'Lister les participants d\'un giveaway.' },
            { name: '`;reroll <id>`',                   value: 'Re-tirer un gagnant pour un giveaway terminé.' },
            { name: 'Durées acceptées',                 value: '`30s` · `15m` · `2h` · `7d`' },
          ),
      ],
    });
  },
};
