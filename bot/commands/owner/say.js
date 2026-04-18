'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'say',
  aliases    : [],
  description: 'Fait envoyer un message par le bot dans un salon.',
  usage      : ';say [#salon] <message>',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      let channel = message.mentions.channels.first();
      let content;

      if (channel) {
        content = args.slice(1).join(' ').trim();
      } else {
        channel = message.channel;
        content = args.join(' ').trim();
      }

      if (!content) return message.reply({ embeds: [E.usage(';', 'say [#salon] <message>')] });
      if (content.length > 2000) return message.reply({ embeds: [E.error('Message trop long', 'Maximum 2000 caractères.')] });

      try {
        await channel.send({ content });
      } catch {
        return message.reply({ embeds: [E.error('Envoi impossible', `Je n'ai pas accès à <#${channel.id}>.`)] });
      }

      if (channel.id !== message.channel.id) {
        await message.channel.send({ embeds: [E.success('Message envoyé', `Envoyé dans <#${channel.id}>.`)] });
      }

      try { await message.delete(); } catch { /* pas de permission de supprimer */ }
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
