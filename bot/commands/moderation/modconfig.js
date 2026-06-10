'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/response-builder');

module.exports = {
  name       : 'modconfig',
  aliases    : ['moderationconfig', 'modcfg'],
  category   : 'moderation',
  description: 'Configuration du système de modération.',
  usage      : ';modconfig',
  permissions: ['Administrator'],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [errorEmbed('Accès refusé', 'Cette commande est réservée aux administrateurs.')] });
    }
    const { renderModconfigPanel } = require('../../ui/panels/modconfig-panel');
    return message.reply(renderModconfigPanel(message.guild.id));
  },
};
