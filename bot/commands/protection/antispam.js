'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderAntispamPanel } = require('../../ui/panels/antispam-panel');

module.exports = {
  name       : 'antispam',
  aliases    : ['aspam', 'spam'],
  description: 'Ouvre le panel de configuration anti-spam.',
  usage      : ';antispam',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }
    return message.channel.send(renderAntispamPanel(message.guild.id));
  },
};
