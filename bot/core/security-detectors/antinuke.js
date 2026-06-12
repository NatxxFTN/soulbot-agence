'use strict';

// ═══════════════════════════════════════════════
// ANTI-NUKE — détecteur d'actions destructives de masse (SOC Phase 1)
// Compte les actions destructives PAR EXÉCUTEUR (modo véreux / compte
// compromis) sur fenêtre glissante : bans, kicks, suppressions de
// salons/rôles. Au-delà du seuil → sanction de l'exécuteur.
// ATTENTION : IGNORE le vault volontairement — un nuker AVEC rôle staff est
// précisément le scénario visé (menace interne). Seuls garde-fous :
// owner + le bot lui-même (via apply-sanction).
// config : security_config feature='antinuke'
//   threshold = actions max dans la fenêtre (défaut 5)
//   custom_data.window_seconds = fenêtre (défaut 60)
// ═══════════════════════════════════════════════

const { AuditLogEvent } = require('discord.js');

// guildId:executorId -> [timestamps]
const actionMap = new Map();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [key, stamps] of actionMap) {
    const kept = stamps.filter(t => t > cutoff);
    if (kept.length === 0) actionMap.delete(key); else actionMap.set(key, kept);
  }
}, 5 * 60_000).unref?.();

function parseWindow(config) {
  if (!config?.custom_data) return 60;
  try {
    const d = typeof config.custom_data === 'string' ? JSON.parse(config.custom_data) : config.custom_data;
    const s = Number(d?.window_seconds);
    return (Number.isFinite(s) && s >= 10 && s <= 600) ? s : 60;
  } catch { return 60; }
}

/**
 * Enregistre une action destructive — détection pure, exportée pour les tests.
 * @param {string} actionType - 'channel_delete'|'role_delete'|'ban'|'kick'
 * @param {number} [now] - injectable pour les tests
 * @returns {?{triggered: true, count: number, reason: string}}
 */
function recordAction(guildId, executorId, actionType, config, now = Date.now(), state = actionMap) {
  const threshold = Number(config?.threshold) >= 2 ? Number(config.threshold) : 5;
  const windowMs  = parseWindow(config) * 1000;
  const key = `${guildId}:${executorId}`;

  const stamps = (state.get(key) || []).filter(t => now - t < windowMs);
  stamps.push(now);
  state.set(key, stamps);

  if (stamps.length >= threshold) {
    state.delete(key); // reset — pas de re-trigger en boucle
    return {
      triggered: true,
      count    : stamps.length,
      reason   : `Anti-Nuke : ${stamps.length} actions destructives en ${windowMs / 1000}s (dernière : ${actionType})`,
    };
  }
  return null;
}

/**
 * Retrouve l'exécuteur d'une action via les audit logs (entrée < 15 s).
 * @returns {?{executorId: string}}
 */
async function findExecutor(guild, auditType, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditType, limit: 3 });
    const entry = logs.entries.find(en =>
      (!targetId || en.targetId === targetId) &&
      Date.now() - en.createdTimestamp < 15_000,
    );
    return entry?.executorId ? { executorId: entry.executorId } : null;
  } catch {
    return null; // pas la perm ViewAuditLog → détection impossible, pas de crash
  }
}

/**
 * Pipeline commun aux 4 events : config → exécuteur → comptage → sanction.
 * @param {import('discord.js').Guild} guild
 */
async function processDestructiveAction(guild, auditType, targetId, actionType) {
  const storage = require('../security-storage');
  const config = storage.getConfig(guild.id, 'antinuke');
  if (!config?.enabled) return;

  const found = await findExecutor(guild, auditType, targetId);
  if (!found) return;
  const { executorId } = found;

  // Le bot lui-même (ses sanctions auto génèrent des bans/kicks) et l'owner
  // ne comptent jamais.
  if (executorId === guild.client.user.id) return;
  if (executorId === guild.ownerId) return;

  const hit = recordAction(guild.id, executorId, actionType, config);
  if (!hit) return;

  const registry = require('../security-registry');
  const { applySanctionMember } = require('../apply-sanction');

  // Plancher antinuke : jamais en dessous de timeout (un nuker qu'on se
  // contente de "delete" n'a aucun sens).
  const configured = registry.normalizeSanction(config.action).sanction;
  const fallback = ['timeout', 'kick', 'ban'].includes(configured) ? config.action : 'timeout';
  const res = registry.sanctionForTrigger(guild.id, executorId, 'antinuke', fallback);

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (member) {
    await applySanctionMember(member, 'antinuke', res.action, hit.reason, {
      durationMs: res.durationMs,
      detail    : hit.reason,
    });
  } else {
    storage.logAction(guild.id, executorId, 'antinuke', res.action, `${hit.reason} (exécuteur hors serveur)`, null);
    storage.incrementStat(guild.id, 'antinuke');
  }

  // Alerte admins (salon système) — même pattern que l'alerte raid
  try {
    const channel = guild.systemChannel;
    if (channel) {
      await channel.send({
        content: `[ANTI-NUKE] <@${executorId}> — ${hit.reason} | sanction : ${res.action}`,
        allowedMentions: { parse: [] },
      }).catch(() => {});
    }
  } catch { /* pas de salon système */ }
}

module.exports = {
  recordAction, parseWindow, findExecutor, processDestructiveAction,
  AUDIT_TYPES: {
    channel_delete: AuditLogEvent.ChannelDelete,
    role_delete   : AuditLogEvent.RoleDelete,
    ban           : AuditLogEvent.MemberBanAdd,
    kick          : AuditLogEvent.MemberKick,
  },
};
