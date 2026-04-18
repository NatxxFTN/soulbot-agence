'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'resetstatut',
  aliases    : ['resetstatus'],
  description: 'Remet le statut du bot à sa valeur par défaut.',
  usage      : ';resetstatut',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      client.user.setPresence({ activities: [], status: 'online' });
      return message.channel.send({ embeds: [E.success('Statut réinitialisé', 'Le statut du bot a été remis à zéro.')] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
