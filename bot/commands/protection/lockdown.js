'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderLockdownPanel } = require('../../ui/panels/lockdown-panel');

module.exports = {
  name       : 'lockdown',
  aliases    : ['ld', 'lock'],
  description: 'Ouvre le panel de verrouillage d\'urgence du serveur.',
  usage      : ';lockdown',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }
    return message.channel.send(renderLockdownPanel(message.guild.id));
  },
};
