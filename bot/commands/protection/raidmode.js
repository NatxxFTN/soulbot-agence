'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderRaidmodePanel } = require('../../ui/panels/raidmode-panel');

module.exports = {
  name       : 'raidmode',
  aliases    : ['antiraid', 'raid'],
  description: 'Ouvre le panel de protection anti-raid automatique.',
  usage      : ';raidmode',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }
    return message.channel.send(renderRaidmodePanel(message.guild.id));
  },
};
