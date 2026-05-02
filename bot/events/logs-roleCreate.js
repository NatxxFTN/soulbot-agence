'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'roleCreate',

  async execute(role) {
    let executor = null;
    try {
      const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target?.id === role.id && Date.now() - entry.createdTimestamp < 10_000) {
        executor = entry.executor;
      }
    } catch { /* perms */ }

    L.log(role.guild, 'role_create', {
      roleId      : role.id,
      name        : role.name,
      color       : role.color,
      position    : role.position,
      permissions : role.permissions.toArray(),
      mentionable : role.mentionable,
      hoist       : role.hoist,
      managed     : role.managed,
      executor,
      summary     : `Rôle créé : ${role.name}`,
      targetId    : role.id,
      actorId     : executor?.id || null,
    });
  },
};
