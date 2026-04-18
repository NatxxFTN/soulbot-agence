'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'mp',
  aliases    : ['dm'],
  description: 'Envoie un message privé à un utilisateur via le bot.',
  usage      : ';mp @user <message>',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [E.usage(';', 'mp @user <message>')] });
      if (target.bot) return message.reply({ embeds: [E.error('Action impossible', 'Impossible d\'envoyer un MP à un bot.')] });

      const content = args.slice(1).join(' ').trim();
      if (!content) return message.reply({ embeds: [E.usage(';', 'mp @user <message>')] });

      try {
        await target.send({ embeds: [E.base().setDescription(content)] });
      } catch {
        return message.reply({ embeds: [E.error('MP bloqué', `${target.tag} a les MPs désactivés ou a bloqué le bot.`)] });
      }

      return message.channel.send({
        embeds: [E.success('MP envoyé', `Message envoyé à **${target.tag}**.\n> ${content.slice(0, 200)}`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
