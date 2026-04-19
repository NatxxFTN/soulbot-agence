'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name        : 'ping',
  aliases     : [],
  description : 'Affiche la latence du bot et de l\'API Discord.',
  usage       : ';ping',
  cooldown    : 5,
  guildOnly   : true,
  ownerOnly   : false,
  permissions : [],

  async execute(message, args, client) {
    const sent    = await message.reply({ embeds: [E.info('Calcul...', 'Mesure en cours...')] });
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const api     = Math.round(client.ws.ping);

    const statusColor = latency < 150 ? 'success' : latency < 400 ? 'warning' : 'error';
    const bar         = latency < 150 ? '▓▓▓▓▓▓▓▓▓▓' : latency < 400 ? '▓▓▓▓▓░░░░░' : '▓▓░░░░░░░░';

    await sent.edit({
      embeds: [
        E[statusColor]('Pong !', `**Latence bot :** ${latency}ms\n**Latence API :** ${api}ms\n\n${bar}`),
      ],
    }).catch(() => {});
  },
};
