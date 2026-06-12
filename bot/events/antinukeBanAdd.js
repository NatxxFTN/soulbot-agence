'use strict';

// ── Anti-Nuke : ban ajouté ───────────────────────────────────────────────────
const { processDestructiveAction, AUDIT_TYPES } = require('../core/security-detectors/antinuke');

module.exports = {
  name: 'guildBanAdd',
  once: false,
  async execute(ban, _client) {
    if (!ban.guild) return;
    await processDestructiveAction(ban.guild, AUDIT_TYPES.ban, ban.user?.id ?? null, 'ban');
  },
};
