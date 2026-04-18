'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'setname',
  aliases    : [],
  description: 'Change le nom du bot (limité par Discord : 2 fois / heure).',
  usage      : ';setname <nouveau nom>',
  cooldown   : 30,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const name = args.join(' ').trim().slice(0, 32);
      if (!name) return message.reply({ embeds: [E.usage(';', 'setname <nouveau nom>')] });
      if (name.length < 2) return message.reply({ embeds: [E.error('Nom trop court', 'Le nom doit contenir au moins 2 caractères.')] });

      const oldName = client.user.username;
      await client.user.edit({ username: name });

      return message.channel.send({
        embeds: [E.success('Nom mis à jour', `\`${oldName}\` → \`${name}\`\n⚠ Discord limite ce changement à 2 fois par heure.`)],
      });
    } catch (err) {
      if (err.code === 50035) {
        return message.channel.send({ embeds: [E.error('Limite atteinte', 'Tu as atteint la limite de changements de nom Discord (2/heure).')] });
      }
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
