'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'alias',
  aliases    : [],
  description: 'Liste tous les alias de commandes actifs.',
  usage      : ';alias',
  cooldown   : 3,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const entries = [...client.aliases.entries()];

      if (!entries.length) {
        return message.channel.send({
          embeds: [E.info('Alias', 'Aucun alias enregistré.')],
        });
      }

      const lines = entries
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([alias, cmd]) => `\`${alias}\` → \`${cmd}\``)
        .join('\n');

      return message.channel.send({
        embeds: [
          E.base()
            .setTitle('Alias de commandes')
            .setDescription(lines)
            .setFooter({ text: `${entries.length} alias chargés` }),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
