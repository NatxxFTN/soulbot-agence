'use strict';

const E = require('../../utils/embeds');
const { getTicketByChannel, claimTicket, getConfig, logAction } = require('../../core/ticket-helper');

module.exports = {
  name       : 'claim',
  aliases    : ['tclaim', 'assign'],
  description: 'Prendre en charge le ticket courant (staff seulement).',
  usage      : ';claim',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    const ticket = getTicketByChannel(message.channel.id);
    if (!ticket) {
      return message.reply({ embeds: [E.error('Hors ticket', 'Cette commande s\'utilise dans un salon ticket.')] });
    }
    if (ticket.status !== 'open') {
      return message.reply({ embeds: [E.error('Ticket fermé', 'Ce ticket n\'est plus actif.')] });
    }

    const config = getConfig(message.guild.id);

    if (config?.staff_role_id && !message.member.roles.cache.has(config.staff_role_id)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Seuls les membres staff peuvent claim un ticket.')] });
    }

    if (ticket.claimed_by) {
      const already = ticket.claimed_by === message.author.id ? 'toi' : `<@${ticket.claimed_by}>`;
      return message.reply({ embeds: [E.warning('Déjà pris en charge', `Ce ticket est déjà géré par ${already}.`)] });
    }

    claimTicket(ticket.id, message.author.id);

    await logAction(message.guild, config, `👤 Ticket #${ticket.ticket_number} pris en charge par ${message.author.tag}`);

    return message.channel.send({
      embeds: [
        E.success('Ticket pris en charge')
          .addFields(
            { name: 'Staff',   value: message.author.toString(), inline: true },
            { name: 'Ticket',  value: `#${ticket.ticket_number}`, inline: true },
          ),
      ],
    });
  },
};
