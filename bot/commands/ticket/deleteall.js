'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getClosedTickets, markDeleted, getConfig, logAction } = require('../../core/ticket-helper');

module.exports = {
  name       : 'deleteall',
  aliases    : ['dallticket', 'purgetickets'],
  description: 'Supprimer tous les tickets fermés du serveur.',
  usage      : ';deleteall',
  cooldown   : 15,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const tickets = getClosedTickets(message.guild.id);
    if (!tickets.length) {
      return message.reply({ embeds: [E.info('Aucun ticket fermé', 'Il n\'y a aucun ticket fermé à supprimer.')] });
    }

    const config  = getConfig(message.guild.id);
    let success = 0;
    let failed  = 0;

    for (const ticket of tickets) {
      try {
        markDeleted(ticket.id);
        const ch = message.guild.channels.cache.get(ticket.channel_id);
        if (ch) await ch.delete(`Mass delete par ${message.author.tag}`).catch(() => {});
        success++;
      } catch {
        failed++;
      }
    }

    await logAction(message.guild, config, `🗑️ Mass delete par ${message.author.tag} — ${success} ticket(s) supprimé(s)`);

    return message.channel.send({
      embeds: [
        E.success('Tickets supprimés')
          .addFields(
            { name: 'Supprimés', value: `${success}`, inline: true },
            { name: 'Échoués',   value: `${failed}`,  inline: true },
            { name: 'Par',       value: message.author.tag, inline: true },
          ),
      ],
    });
  },
};
