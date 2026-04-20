'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { renderMainPanel } = require('../../ui/panels/greeting-panel');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'greeting',
  aliases    : ['greet', 'welcomeconfig'],
  description: 'Ouvre le panel de configuration des arrivées/départs.',
  usage      : ';greeting',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    try {
      return message.reply(renderMainPanel(message.guild.id));
    } catch (err) {
      console.error('[greeting cmd]', err);
      return message.reply({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
