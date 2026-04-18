'use strict';

const E = require('../../utils/embeds');
const { getGuildSettings, setGuildSetting } = require('../../database');

module.exports = {
  name       : 'prefix',
  aliases    : [],
  description: 'Change le préfixe des commandes du bot sur ce serveur.',
  usage      : ';prefix <nouveau_préfixe>',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      if (!args[0]) {
        const settings = getGuildSettings(message.guild.id);
        return message.channel.send({
          embeds: [E.info('Préfixe actuel', `Le préfixe de ce serveur est \`${settings.prefix}\``)],
        });
      }

      const newPrefix = args[0].slice(0, 5);
      if (/\s/.test(newPrefix)) {
        return message.reply({ embeds: [E.error('Préfixe invalide', 'Le préfixe ne peut pas contenir d\'espaces.')] });
      }

      setGuildSetting(message.guild.id, 'prefix', newPrefix);

      return message.channel.send({
        embeds: [E.success('Préfixe mis à jour', `Nouveau préfixe : \`${newPrefix}\`\nExemple : \`${newPrefix}help\``)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
