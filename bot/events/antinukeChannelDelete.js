'use strict';

// ── Anti-Nuke : suppression de salon ─────────────────────────────────────────
const { processDestructiveAction, AUDIT_TYPES } = require('../core/security-detectors/antinuke');

module.exports = {
  name: 'channelDelete',
  once: false,
  async execute(channel, _client) {
    if (!channel.guild) return;
    await processDestructiveAction(channel.guild, AUDIT_TYPES.channel_delete, channel.id, 'channel_delete');
  },
};
