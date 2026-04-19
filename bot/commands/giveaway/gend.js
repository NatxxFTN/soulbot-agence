'use strict';

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const E = require('../../utils/embeds');
const { getGiveaway, drawWinners, markEnded } = require('../../core/giveaway-helper');

module.exports = {
  name       : 'gend',
  aliases    : ['gstop', 'gfinish'],
  description: 'Terminer un giveaway immédiatement et tirer les gagnants.',
  usage      : ';gend <id>',
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
      return message.reply({ embeds: [E.error('ID manquant', 'Usage : `;gend <id>`')] });
    }

    const gw = getGiveaway(id);
    if (!gw) {
      return message.reply({ embeds: [E.error('Introuvable', `Aucun giveaway avec l'ID \`${id}\`.`)] });
    }
    if (gw.ended) {
      return message.reply({ embeds: [E.warning('Déjà terminé', 'Ce giveaway est déjà fini. Utilise `;reroll` pour re-tirer.')] });
    }
    if (gw.guild_id !== message.guild.id) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Ce giveaway n\'appartient pas à ce serveur.')] });
    }

    const winners = drawWinners(id, gw.winners_count);
    markEnded(id, winners);

    const mentions = winners.length ? winners.map(w => `<@${w}>`).join(', ') : '*aucun participant*';

    const channel = message.guild.channels.cache.get(gw.channel_id);
    if (channel) {
      await channel.send({
        content: winners.length ? winners.map(w => `<@${w}>`).join(' ') : '',
        embeds: [
          new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('🎉 Giveaway terminé !')
            .setDescription(`**Gain :** ${gw.prize}\n**Gagnant(s) :** ${mentions}`)
            .setTimestamp(),
        ],
      }).catch(() => {});
    }

    return message.reply({
      embeds: [
        E.success('Giveaway terminé')
          .addFields(
            { name: 'Gain',       value: gw.prize,              inline: true },
            { name: 'Gagnant(s)', value: mentions,              inline: true },
            { name: 'Participants', value: `${winners.length}`, inline: true },
          ),
      ],
    });
  },
};
