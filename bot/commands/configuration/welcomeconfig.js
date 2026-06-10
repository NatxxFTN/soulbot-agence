'use strict';

const { renderMainPanel } = require('../../ui/panels/welcome-panel');
const { errorEmbed } = require('../../utils/response-builder');

module.exports = {
  name       : 'welcomeconfig',
  aliases    : ['welcomecfg', 'wconfig'],
  category   : 'Configuration',
  description: 'Configure le système de bienvenue ultra-personnalisable.',
  usage      : ';welcomeconfig',
  ownerOnly  : false,
  permissions: ['Administrator'],

  async execute(message) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply({ embeds: [errorEmbed('Permission manquante', 'Administrateur requis.')] });
    }
    try {
      return message.reply(renderMainPanel(message.guild.id));
    } catch (err) {
      console.error('[welcomeconfig]', err);
      return message.reply({ embeds: [errorEmbed('Erreur', `Impossible d'ouvrir le panel : ${err.message}`)] });
    }
  },
};
