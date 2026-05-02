'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

function _hex(v) { return v ? `#${v.toString(16).padStart(6, '0').toUpperCase()}` : '—'; }

module.exports = {
  name : 'roleUpdate',

  async execute(oldRole, newRole) {
    const diffs = [];
    if (oldRole.name !== newRole.name) diffs.push(`**Nom** : \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color) diffs.push(`**Couleur** : \`${_hex(oldRole.color)}\` → \`${_hex(newRole.color)}\``);
    if (oldRole.hoist !== newRole.hoist) diffs.push(`**Épinglé** : ${oldRole.hoist ? 'Oui' : 'Non'} → ${newRole.hoist ? 'Oui' : 'Non'}`);
    if (oldRole.mentionable !== newRole.mentionable) diffs.push(`**Mentionnable** : ${oldRole.mentionable ? 'Oui' : 'Non'} → ${newRole.mentionable ? 'Oui' : 'Non'}`);

    const permsChanged = oldRole.permissions.bitfield !== newRole.permissions.bitfield;
    let added = [], removed = [];
    if (permsChanged) {
      const oldPerms = new Set(oldRole.permissions.toArray());
      const newPerms = new Set(newRole.permissions.toArray());
      added = [...newPerms].filter(p => !oldPerms.has(p));
      removed = [...oldPerms].filter(p => !newPerms.has(p));
      if (added.length) diffs.push(`**Permissions ajoutées** : ${added.length}`);
      if (removed.length) diffs.push(`**Permissions retirées** : ${removed.length}`);
    }

    if (!diffs.length) return;

    let executor = null;
    try {
      const audit = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target?.id === newRole.id && Date.now() - entry.createdTimestamp < 10_000) {
        executor = entry.executor;
      }
    } catch { /* perms */ }

    // Si seules les permissions changent → log dédié role_permission_change
    if (permsChanged && diffs.every(d => d.startsWith('**Permissions'))) {
      L.log(newRole.guild, 'role_permission_change', {
        roleId : newRole.id,
        name   : newRole.name,
        added,
        removed,
        executor,
        summary: `Permissions de ${newRole.name} modifiées (+${added.length} -${removed.length})`,
        targetId: newRole.id,
        actorId : executor?.id || null,
      });
      return;
    }

    L.log(newRole.guild, 'role_update', {
      roleId : newRole.id,
      name   : newRole.name,
      diffs,
      executor,
      summary: `Rôle modifié : ${newRole.name}`,
      targetId: newRole.id,
      actorId : executor?.id || null,
    });
  },
};
