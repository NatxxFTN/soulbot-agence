'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderTicketPanel } = require('../../ui/panels/ticket-panel');

module.exports = {
  name       : 'ticketconfig',
  aliases    : ['ticketsetup', 'ticketcfg'],
  description: 'Ouvre le panel de configuration des tickets.',
  usage      : ';ticketconfig',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }
    return message.channel.send(renderTicketPanel(message.guild.id));
  },
};
