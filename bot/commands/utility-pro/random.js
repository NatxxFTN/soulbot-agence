'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'random',
  aliases    : ['rand', 'aleatoire'],
  description: 'Nombre aléatoire entre min et max (inclus).',
  usage      : ';random <min> <max>',
  cooldown   : 2,
  guildOnly  : false,

  async execute(message, args) {
    const min = parseInt(args[0], 10);
    const max = parseInt(args[1], 10);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      return message.reply({ embeds: [E.error('Usage', '`;random <min> <max>`')] });
    }
    if (min >= max) return message.reply({ embeds: [E.error('Invalide', 'min doit être < max.')] });

    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    return message.reply({
      embeds: [E.base()
        .setTitle('🎲 Random')
        .setDescription(`Entre **${min}** et **${max}** : **${result}**`)],
    });
  },
};
