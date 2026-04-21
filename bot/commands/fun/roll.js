'use strict';

const E = require('../../utils/embeds');
const { e } = require('../../core/emojis');

module.exports = {
  name      : 'roll',
  aliases   : ['dice', 'de'],
  description: 'Lance un dé à N faces (2–1000).',
  usage     : ';roll [faces]',
  cooldown  : 2,

  guildOnly  : true,

  async execute(message, args) {
    const faces = parseInt(args[0], 10) || 6;

    if (faces < 2 || faces > 1000) {
      return message.reply({ embeds: [E.error('Valeur invalide', 'Le dé doit avoir entre **2** et **1000** faces.')] });
    }

    const msg = await message.channel.send(`${e('ani_dice')} **Lancement du dé à ${faces} faces...**`);
    await new Promise(r => setTimeout(r, 1500));
    const result = Math.floor(Math.random() * faces) + 1;
    await msg.edit(`${e('ani_dice')} Tu as fait : **${result}** / ${faces}`);
  },
};
