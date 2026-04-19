'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getTicketByChannel, markDeleted, getConfig, logAction } = require('../../core/ticket-helper');

module.exports = {
  name       : 'delete',
  aliases    : ['tdelete', 'delticket'],
  description: 'Supprimer définitivement le ticket courant.',
  usage      : ';delete',
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
      return message.reply({ embeds: [E.error('Ticket ouvert', 'Ferme le ticket d\'abord avec `;close` avant de le supprimer.')] });
    }

    const config = getConfig(message.guild.id);
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
    const isMod   = config?.staff_role_id ? message.member.roles.cache.has(config.staff_role_id) : false;

    if (!isAdmin && !isMod) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Seul un staff ou admin peut supprimer un ticket.')] });
    }

    await logAction(message.guild, config, `🗑️ Ticket #${ticket.ticket_number} supprimé par ${message.author.tag}`);

    markDeleted(ticket.id);
    await message.channel.delete(`Supprimé par ${message.author.tag}`).catch(() => {});
  },
};
