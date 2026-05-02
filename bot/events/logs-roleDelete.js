'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'roleDelete',

  async execute(role) {
    let executor = null;
    try {
      const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target?.id === role.id && Date.now() - entry.createdTimestamp < 10_000) {
        executor = entry.executor;
      }
    } catch { /* perms */ }

    L.log(role.guild, 'role_delete', {
      roleId     : role.id,
      name       : role.name,
      color      : role.color,
      position   : role.position,
      memberCount: role.members?.size || 0,
      executor,
      summary    : `Rôle supprimé : ${role.name}`,
      targetId   : role.id,
      actorId    : executor?.id || null,
    });
  },
};
