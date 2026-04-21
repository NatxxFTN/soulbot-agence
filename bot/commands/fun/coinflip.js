'use strict';

const { e } = require('../../core/emojis');

module.exports = {
  name      : 'coinflip',
  aliases   : ['pile', 'face', 'coin'],
  description: 'Lance une pièce : Pile ou Face.',
  usage     : ';coinflip',
  cooldown  : 2,

  guildOnly  : true,

  async execute(message) {
    const msg = await message.channel.send(`${e('ani_coin')} **La pièce tourne...**`);
    await new Promise(r => setTimeout(r, 2000));
    const result = Math.random() < 0.5 ? '🪙 Pile' : '🟡 Face';
    await msg.edit(`${e('ani_coin')} Résultat : **${result}** !`);
  },
};
