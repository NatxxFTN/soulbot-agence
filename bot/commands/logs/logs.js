'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// ;logs — Panel central V3 Ultimate
// Cache-first, 0 DB query en lecture panel (sauf stats daily).
// ═══════════════════════════════════════════════════════════════════════════

const { renderLogsV3Panel } = require('../../ui/panels/logs-v3-panel');

module.exports = {
  name       : 'logs',
  aliases    : ['logconfig', 'logspanel'],
  description: 'Panel central V3 des logs serveur (status, activité 24h, groupes, actions)',
  usage      : ';logs',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message) {
    return message.reply({
      ...renderLogsV3Panel(message.guild),
      allowedMentions: { repliedUser: false },
    });
  },
};
