'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getTicketByChannel, reopenTicket, getConfig, logAction } = require('../../core/ticket-helper');

module.exports = {
  name       : 'reopen',
  aliases    : ['rouvrir', 'openagain'],
  description: 'Rouvrir un ticket fermé.',
  usage      : ';reopen',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    const ticket = getTicketByChannel(message.channel.id);
    if (!ticket) {
      return message.reply({ embeds: [E.error('Hors ticket', 'Cette commande s\'utilise dans un salon ticket.')] });
    }
    if (ticket.status === 'open') {
      return message.reply({ embeds: [E.warning('Déjà ouvert', 'Ce ticket est déjà actif.')] });
    }
    if (ticket.status === 'deleted') {
      return message.reply({ embeds: [E.error('Supprimé', 'Impossible de rouvrir un ticket supprimé.')] });
    }

    const config = getConfig(message.guild.id);
    const isMod  = config?.staff_role_id ? message.member.roles.cache.has(config.staff_role_id) : false;
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isMod && !isAdmin) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Seul un staff ou admin peut rouvrir un ticket.')] });
    }

    reopenTicket(ticket.id);

    try {
      await message.channel.setName(`ticket-${String(ticket.ticket_number).padStart(4, '0')}`);
      await message.channel.permissionOverwrites.edit(ticket.user_id, {
        ViewChannel     : true,
        SendMessages    : true,
        ReadMessageHistory: true,
      }).catch(() => {});
    } catch { /* permissions — on continue */ }

    await logAction(message.guild, config, `🔓 Ticket #${ticket.ticket_number} rouvert par ${message.author.tag}`);

    return message.channel.send({
      embeds: [
        E.success('Ticket rouvert')
          .addFields(
            { name: 'Ticket',   value: `#${ticket.ticket_number}`, inline: true },
            { name: 'Rouvert par', value: message.author.tag,      inline: true },
          ),
      ],
    });
  },
};
