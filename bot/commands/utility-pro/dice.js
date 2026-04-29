'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'dice',
  aliases    : ['de', 'roll'],
  description: 'Lance un ou plusieurs dés.',
  usage      : ';dice [faces=6] [count=1]',
  cooldown   : 2,
  guildOnly  : false,

  async execute(message, args) {
    const faces = Math.max(2, Math.min(1000, parseInt(args[0], 10) || 6));
    const count = Math.max(1, Math.min(20, parseInt(args[1], 10) || 1));

    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * faces));
    const total = rolls.reduce((a, b) => a + b, 0);

    return message.reply({
      embeds: [E.base()
        .setTitle(`🎲 ${count}d${faces}`)
        .setDescription(rolls.map(r => `\`${r}\``).join(' · ') + (count > 1 ? `\n\n**Total : ${total}**` : ''))],
    });
  },
};
