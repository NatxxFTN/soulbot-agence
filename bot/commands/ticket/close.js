'use strict';

const E = require('../../utils/embeds');
const { getTicketByChannel, closeTicket, getConfig, logAction } = require('../../core/ticket-helper');

module.exports = {
  name       : 'close',
  aliases    : ['cl', 'fermer'],
  description: 'Fermer le ticket courant (archive, pas supprimé).',
  usage      : ';close [raison]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    const ticket = getTicketByChannel(message.channel.id);
    if (!ticket) {
      return message.reply({ embeds: [E.error('Hors ticket', 'Cette commande s\'utilise dans un salon ticket.')] });
    }
    if (ticket.status !== 'open') {
      return message.reply({ embeds: [E.error('Déjà fermé', 'Ce ticket est déjà fermé.')] });
    }

    const config = getConfig(message.guild.id);
    const isMod  = config?.staff_role_id ? message.member.roles.cache.has(config.staff_role_id) : false;
    const isOwner = message.author.id === ticket.user_id;

    if (!isMod && !isOwner && !message.member.permissions.has(0x8n)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Seul le créateur du ticket ou un staff peut le fermer.')] });
    }

    const reason = (args.join(' ') || 'Aucune raison fournie').slice(0, 512);

    closeTicket(ticket.id, message.author.id);

    try {
      await message.channel.setName(`closed-${String(ticket.ticket_number).padStart(4, '0')}`);
      // Retirer le droit d'écriture du créateur
      await message.channel.permissionOverwrites.edit(ticket.user_id, { SendMessages: false }).catch(() => {});
    } catch { /* permissions insuffisantes — on continue */ }

    await logAction(message.guild, config, `🔒 Ticket #${ticket.ticket_number} fermé par ${message.author.tag} — ${reason}`);

    return message.channel.send({
      embeds: [
        E.warning('Ticket fermé')
          .addFields(
            { name: 'Fermé par', value: message.author.tag, inline: true },
            { name: 'Raison',    value: reason },
          )
          .setFooter({ text: 'Utilise ;delete pour supprimer · ;reopen pour rouvrir' }),
      ],
    });
  },
};
