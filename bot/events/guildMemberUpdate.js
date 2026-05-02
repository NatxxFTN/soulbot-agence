'use strict';

const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { db, getGuildSettings } = require('../database');
const { logChange: logNickChange } = require('../core/nickname-history-storage');
const auditMod = require('../core/audit-mod-storage');

module.exports = {
  name : 'guildMemberUpdate',

  async execute(oldMember, newMember, client) {
    const guildId = newMember.guild.id;

    // ── Role locks (Pack Audit-Mod ;rolelock) ────────────────────────────────
    // Si un rôle locké est ajouté ou retiré par un non-Admin, on restaure.
    try {
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;
      const added    = [...newRoles.keys()].filter(id => !oldRoles.has(id));
      const removed  = [...oldRoles.keys()].filter(id => !newRoles.has(id));
      const lockedTouched = [...added, ...removed].filter(id => auditMod.isRoleLocked(guildId, id));

      if (lockedTouched.length) {
        let executor = null;
        try {
          const audit = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 });
          const entry = audit.entries.first();
          if (entry && entry.target?.id === newMember.id && Date.now() - entry.createdTimestamp < 10_000) {
            executor = entry.executor;
          }
        } catch { /* perms */ }

        const isAdmin = executor
          ? (await newMember.guild.members.fetch(executor.id).catch(() => null))?.permissions.has(PermissionFlagsBits.Administrator)
          : false;
        const isBot = executor?.bot && executor.id === client.user.id; // bot lui-même = OK (ex: ;quarantine)

        if (!isAdmin && !isBot) {
          // Restaurer l'état précédent : ré-ajouter ce qui a été retiré, retirer ce qui a été ajouté
          for (const id of removed) {
            if (auditMod.isRoleLocked(guildId, id)) {
              await newMember.roles.add(id, 'Role lock — restauration auto').catch(() => {});
            }
          }
          for (const id of added) {
            if (auditMod.isRoleLocked(guildId, id)) {
              await newMember.roles.remove(id, 'Role lock — restauration auto').catch(() => {});
            }
          }
          // Hook log V3 (best-effort, fire-and-forget)
          try {
            const L = require('../core/logs-v3-helper');
            L.log(newMember.guild, 'role_permission_change', {
              roleId  : lockedTouched[0],
              name    : newMember.guild.roles.cache.get(lockedTouched[0])?.name || 'rôle locké',
              executor,
              summary : `Tentative de modification d'un rôle locké sur ${newMember.user.tag} — restaurée`,
              targetId: newMember.id,
              actorId : executor?.id || null,
            });
          } catch { /* logs V3 indisponible */ }
        }
      }
    } catch { /* défensif : ne jamais casser guildMemberUpdate */ }

    // ── Nickname history (Innovation Pack ;nickrestore) ──────────────────────
    if (oldMember.nickname !== newMember.nickname) {
      logNickChange(guildId, newMember.id, oldMember.nickname, newMember.nickname, null);
    }

    // ── Rôle Boost ────────────────────────────────────────────────────────────
    const wasBooster = oldMember.premiumSince !== null;
    const isBooster  = newMember.premiumSince !== null;

    if (!wasBooster && isBooster) {
      // Vient de commencer à booster
      const settings = getGuildSettings(guildId);
      if (settings?.role_boost_id) {
        const role = newMember.guild.roles.cache.get(settings.role_boost_id);
        if (role) newMember.roles.add(role).catch(() => {});
      }
    } else if (wasBooster && !isBooster) {
      // A arrêté de booster
      const settings = getGuildSettings(guildId);
      if (settings?.role_boost_id && newMember.roles.cache.has(settings.role_boost_id)) {
        newMember.roles.remove(settings.role_boost_id).catch(() => {});
      }
    }
  },
};
