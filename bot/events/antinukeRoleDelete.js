'use strict';

// ── Anti-Nuke : suppression de rôle ──────────────────────────────────────────
const { processDestructiveAction, AUDIT_TYPES } = require('../core/security-detectors/antinuke');

module.exports = {
  name: 'roleDelete',
  once: false,
  async execute(role, _client) {
    if (!role.guild) return;
    await processDestructiveAction(role.guild, AUDIT_TYPES.role_delete, role.id, 'role_delete');
  },
};
