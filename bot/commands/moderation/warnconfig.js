'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/response-builder');

module.exports = {
  name       : 'warnconfig',
  aliases    : ['warncfg', 'warnsconfig'],
  category   : 'moderation',
  description: 'Configuration du système de warns (seuils, expiration, logs).',
  usage      : ';warnconfig',
  permissions: ['Administrator'],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [errorEmbed('Accès refusé', 'Cette commande est réservée aux administrateurs.')] });
    }
    const { renderWarnconfigPanel } = require('../../ui/panels/warnconfig-panel');
    return message.reply(renderWarnconfigPanel(message.guild.id));
  },
};
