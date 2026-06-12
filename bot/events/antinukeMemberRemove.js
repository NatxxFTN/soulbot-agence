'use strict';

// ── Anti-Nuke : kick (départ + entrée audit MemberKick récente) ──────────────
// guildMemberRemove ne distingue pas départ volontaire et kick :
// processDestructiveAction ne compte que si une entrée audit MemberKick
// ciblant ce membre existe dans les 15 dernières secondes.
const { processDestructiveAction, AUDIT_TYPES } = require('../core/security-detectors/antinuke');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member, _client) {
    if (!member.guild) return;
    await processDestructiveAction(member.guild, AUDIT_TYPES.kick, member.id, 'kick');
  },
};
