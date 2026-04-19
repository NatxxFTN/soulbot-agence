'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'setpic',
  aliases    : ['setavatar'],
  description: 'Change l\'avatar du bot (lien ou pièce jointe).',
  usage      : ';setpic <lien> | ;setpic [avec pièce jointe]',
  cooldown   : 10,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const url = message.attachments.first()?.url ?? args[0];
      if (!url) return message.reply({ embeds: [E.usage(';', 'setpic <lien> ou joindre une image')] });

      await client.user.setAvatar(url);

      return message.channel.send({
        embeds: [
          E.success('Avatar mis à jour', 'L\'avatar du bot a été modifié.')
            .setThumbnail(client.user.displayAvatarURL({ size: 256 })),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
