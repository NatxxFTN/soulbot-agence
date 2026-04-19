'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getConfig } = require('../../core/ticket-helper');

module.exports = {
  name       : 'ticket',
  aliases    : ['tconfig', 'ticketconfig'],
  description: 'Affiche la configuration du système de tickets.',
  usage      : ';ticket',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const config = getConfig(message.guild.id);

    const lines = [
      `**Catégorie** : ${config?.category_id ? `<#${config.category_id}>` : '✗ Non définie'}`,
      `**Logs** : ${config?.log_channel_id ? `<#${config.log_channel_id}>` : '✗ Non défini'}`,
      `**Rôle staff** : ${config?.staff_role_id ? `<@&${config.staff_role_id}>` : '✗ Non défini'}`,
      `**Panel** : ${config?.panel_channel_id ? `<#${config.panel_channel_id}>` : '✗ Non défini'}`,
      `**Tickets créés** : ${config?.ticket_counter ?? 0}`,
      '',
      `Utilise \`;quickticket [@rôle_staff]\` pour une configuration rapide.`,
    ].join('\n');

    return message.channel.send({
      embeds: [E.base().setTitle('Configuration — Tickets').setDescription(lines)],
    });
  },
};
