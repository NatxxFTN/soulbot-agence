'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name      : 'avatar',
  aliases   : ['av', 'pfp'],
  description: 'Affiche l\'avatar d\'un utilisateur en haute résolution.',
  usage     : ';avatar [@utilisateur]',
  cooldown  : 5,

  guildOnly  : true,

  async execute(message, args) {
    const target = message.mentions.users.first() ?? message.author;
    const url    = target.displayAvatarURL({ size: 4096, extension: 'png' });

    const embed = E.base()
      .setTitle(`Avatar de ${target.username}`)
      .setImage(url)
      .addFields({
        name : 'Formats',
        value: [
          `[PNG](${target.displayAvatarURL({ size: 4096, extension: 'png' })})`,
          `[JPG](${target.displayAvatarURL({ size: 4096, extension: 'jpg' })})`,
          `[WEBP](${target.displayAvatarURL({ size: 4096, extension: 'webp' })})`,
        ].join(' · '),
      });

    message.channel.send({ embeds: [embed] });
  },
};
