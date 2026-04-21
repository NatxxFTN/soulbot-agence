'use strict';

const { renderWelcomePanel } = require('../../ui/panels/welcome-panel');

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
      return message.reply({ content: '✗ Administrateur requis.' });
    }
    try {
      return message.reply(renderWelcomePanel(message.guild.id));
    } catch (err) {
      console.error('[welcomeconfig]', err);
      return message.reply({ content: `✗ Erreur : ${err.message}` });
    }
  },
};
