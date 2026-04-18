'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'setbanner',
  aliases    : [],
  description: 'Change la bannière du bot (URL ou pièce jointe).',
  usage      : ';setbanner <url|pièce jointe> | ;setbanner off',
  cooldown   : 10,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      if (args[0]?.toLowerCase() === 'off') {
        await client.user.edit({ banner: null });
        return message.channel.send({ embeds: [E.success('Bannière supprimée', 'La bannière du bot a été retirée.')] });
      }

      const url = args[0] || message.attachments.first()?.url;
      if (!url) return message.reply({ embeds: [E.usage(';', 'setbanner <url|pièce jointe> | setbanner off')] });

      if (!/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url)) {
        return message.reply({ embeds: [E.error('URL invalide', 'Fournis une URL valide vers une image (png, jpg, gif, webp).')] });
      }

      await client.user.edit({ banner: url });
      return message.channel.send({
        embeds: [E.success('Bannière mise à jour').setImage(url)],
      });
    } catch (err) {
      if (err.code === 50035) {
        return message.channel.send({ embeds: [E.error('Compte non éligible', 'La bannière nécessite un compte bot avec Nitro ou vérifié.')] });
      }
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
