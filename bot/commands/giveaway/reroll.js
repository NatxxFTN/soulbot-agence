'use strict';

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const E = require('../../utils/embeds');
const { getGiveaway, drawWinners } = require('../../core/giveaway-helper');

module.exports = {
  name       : 'reroll',
  aliases    : ['greroll', 'grer'],
  description: 'Re-tirer un gagnant pour un giveaway terminé.',
  usage      : ';reroll <id>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) &&
        !message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les événements** ou Admin.')] });
    }

    const id = parseInt(args[0], 10);
    if (!id || isNaN(id)) {
      return message.reply({ embeds: [E.error('ID manquant', 'Usage : `;reroll <id>`')] });
    }

    const gw = getGiveaway(id);
    if (!gw) {
      return message.reply({ embeds: [E.error('Introuvable', `Aucun giveaway avec l'ID \`${id}\`.`)] });
    }
    if (gw.guild_id !== message.guild.id) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Ce giveaway n\'appartient pas à ce serveur.')] });
    }
    if (!gw.ended) {
      return message.reply({ embeds: [E.warning('Giveaway actif', 'Termine d\'abord le giveaway avec `;gend`.')] });
    }

    const winners = drawWinners(id, 1);
    const mention = winners.length ? `<@${winners[0]}>` : '*aucun participant*';

    const channel = message.guild.channels.cache.get(gw.channel_id);
    if (channel) {
      await channel.send({
        content: winners.length ? `<@${winners[0]}>` : '',
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔄 Reroll !')
            .setDescription(`**Nouveau gagnant :** ${mention}\n**Gain :** ${gw.prize}`)
            .setTimestamp(),
        ],
      }).catch(() => {});
    }

    return message.reply({
      embeds: [
        E.success('Reroll effectué')
          .addFields(
            { name: 'Gain',           value: gw.prize, inline: true },
            { name: 'Nouveau gagnant', value: mention,  inline: true },
          ),
      ],
    });
  },
};
