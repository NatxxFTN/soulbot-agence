'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'guildBanRemove',

  async execute(ban) {
    const guild = ban.guild;
    let executor = null;
    try {
      const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target?.id === ban.user.id && Date.now() - entry.createdTimestamp < 10_000) {
        executor = entry.executor;
      }
    } catch { /* perms */ }

    L.log(guild, 'member_unban', {
      user    : ban.user,
      executor,
      summary : `${ban.user.tag} débanni`,
      actorId : executor?.id || null,
      targetId: ban.user.id,
    });
  },
};
