'use strict';

const E = require('../../utils/embeds');
const { getGiveaway, getParticipants } = require('../../core/giveaway-helper');
const { e } = require('../../core/emojis');

module.exports = {
  name       : 'gparticipants',
  aliases    : ['gpart', 'glist'],
  description: 'Lister les participants d\'un giveaway.',
  usage      : ';gparticipants <id>',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    const id = parseInt(args[0], 10);
    if (!id || isNaN(id)) {
      return message.reply({ embeds: [E.error('ID manquant', 'Usage : `;gparticipants <id>`')] });
    }

    const gw = getGiveaway(id);
    if (!gw) {
      return message.reply({ embeds: [E.error('Introuvable', `Aucun giveaway avec l'ID \`${id}\`.`)] });
    }
    if (gw.guild_id !== message.guild.id) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Ce giveaway n\'appartient pas à ce serveur.')] });
    }

    const participants = getParticipants(id);

    if (!participants.length) {
      return message.channel.send({
        embeds: [E.info('Aucun participant', `Le giveaway **${gw.prize}** n\'a encore aucun participant.`)],
      });
    }

    const visible = participants.slice(0, 50).map(uid => `<@${uid}>`).join('\n');
    const more    = participants.length > 50 ? `\n\n*… et ${participants.length - 50} autre(s)*` : '';

    return message.channel.send({
      embeds: [
        E.base()
          .setTitle(`${e('cat_giveaway')} Participants — ${gw.prize}`)
          .setDescription(`${visible}${more}`)
          .addFields(
            { name: 'Total',  value: `${participants.length}`, inline: true },
            { name: 'Statut', value: gw.ended ? '🔒 Terminé' : '🟢 En cours', inline: true },
          ),
      ],
    });
  },
};
