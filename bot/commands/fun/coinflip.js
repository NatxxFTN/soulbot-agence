'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name      : 'coinflip',
  aliases   : ['pile', 'face', 'coin'],
  description: 'Lance une pièce : Pile ou Face.',
  usage     : ';coinflip',
  cooldown  : 2,

  guildOnly  : true,

  async execute(message) {
    const result = Math.random() < 0.5 ? 'Pile' : 'Face';
    const embed  = E.info('Pile ou Face', `Résultat : **${result}**`);
    message.channel.send({ embeds: [embed] });
  },
};
