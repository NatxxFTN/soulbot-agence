'use strict';

const E = require('../../utils/embeds');

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

    const result = Math.floor(Math.random() * faces) + 1;
    const embed  = E.success('Lancer de dé', `**${result}** sur ${faces}`)
      .setFooter({ text: `Dé à ${faces} faces` });

    message.channel.send({ embeds: [embed] });
  },
};
