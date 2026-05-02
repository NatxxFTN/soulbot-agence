'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'guildBanAdd',

  async execute(ban) {
    const guild = ban.guild;
    let executor = null;
    let reason = ban.reason || null;
    try {
      const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target?.id === ban.user.id && Date.now() - entry.createdTimestamp < 10_000) {
        executor = entry.executor;
        reason = reason || entry.reason;
      }
    } catch { /* perms manquantes */ }

    L.log(guild, 'member_ban', {
      user    : ban.user,
      executor,
      reason,
      summary : `${ban.user.tag} banni`,
      actorId : executor?.id || null,
      targetId: ban.user.id,
    });
  },
};
