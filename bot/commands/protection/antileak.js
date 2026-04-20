'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderAntileakPanel } = require('../../ui/panels/antileak-panel');

module.exports = {
  name       : 'antileak',
  aliases    : ['antileaks', 'leak'],
  description: "Ouvre le panel de configuration anti-leak.",
  usage      : ';antileak',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }
    return message.channel.send(renderAntileakPanel(message.guild.id));
  },
};
