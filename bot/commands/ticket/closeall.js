'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getOpenTickets, closeTicket, getConfig, logAction } = require('../../core/ticket-helper');

module.exports = {
  name       : 'closeall',
  aliases    : ['callclose', 'fermetout'],
  description: 'Fermer tous les tickets ouverts du serveur.',
  usage      : ';closeall',
  cooldown   : 10,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const tickets = getOpenTickets(message.guild.id);
    if (!tickets.length) {
      return message.reply({ embeds: [E.info('Aucun ticket ouvert', 'Il n\'y a aucun ticket actif sur ce serveur.')] });
    }

    const config  = getConfig(message.guild.id);
    let success = 0;
    let failed  = 0;

    for (const ticket of tickets) {
      try {
        closeTicket(ticket.id, message.author.id);
        const ch = message.guild.channels.cache.get(ticket.channel_id);
        if (ch) {
          await ch.setName(`closed-${String(ticket.ticket_number).padStart(4, '0')}`).catch(() => {});
          await ch.permissionOverwrites.edit(ticket.user_id, { SendMessages: false }).catch(() => {});
        }
        success++;
      } catch {
        failed++;
      }
    }

    await logAction(message.guild, config, `🔒 Mass close par ${message.author.tag} — ${success} ticket(s) fermé(s)`);

    return message.channel.send({
      embeds: [
        E.success('Tous les tickets fermés')
          .addFields(
            { name: 'Fermés',     value: `${success}`, inline: true },
            { name: 'Échoués',    value: `${failed}`,  inline: true },
            { name: 'Fermé par',  value: message.author.tag, inline: true },
          ),
      ],
    });
  },
};
