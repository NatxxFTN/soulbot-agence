'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT-MOD STORAGE — API persistante pour le Pack Audit & Modération avancée
//
// Tables : guild_mod_actions, guild_quarantine, guild_role_locks
// Cache mémoire pour isRoleLocked (hit chaud sur guildMemberUpdate)
// ═══════════════════════════════════════════════════════════════════════════

const { db } = require('../database');

// ─── Prepared statements ─────────────────────────────────────────────────────

const STMT_RECORD_ACTION = db.prepare(`
  INSERT INTO guild_mod_actions (guild_id, user_id, moderator_id, action_type, reason, duration_ms)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const STMT_USER_HISTORY = db.prepare(`
  SELECT id, user_id, moderator_id, action_type, reason, duration_ms, created_at
    FROM guild_mod_actions
   WHERE guild_id = ? AND user_id = ?
   ORDER BY created_at DESC
   LIMIT ?
`);

const STMT_USER_COUNTS = db.prepare(`
  SELECT action_type AS type, COUNT(*) AS count
    FROM guild_mod_actions
   WHERE guild_id = ? AND user_id = ?
   GROUP BY action_type
`);

const STMT_TOP_MODS = db.prepare(`
  SELECT moderator_id, COUNT(*) AS count
    FROM guild_mod_actions
   WHERE guild_id = ? AND created_at >= ?
   GROUP BY moderator_id
   ORDER BY count DESC
   LIMIT 5
`);

const STMT_TOP_ACTIONS = db.prepare(`
  SELECT action_type AS type, COUNT(*) AS count
    FROM guild_mod_actions
   WHERE guild_id = ? AND created_at >= ?
   GROUP BY action_type
   ORDER BY count DESC
   LIMIT 5
`);

const STMT_DAILY = db.prepare(`
  SELECT CAST(created_at / 86400 AS INTEGER) AS day_bucket, COUNT(*) AS count
    FROM guild_mod_actions
   WHERE guild_id = ? AND created_at >= ?
   GROUP BY day_bucket
   ORDER BY day_bucket ASC
`);

const STMT_QUAR_GET    = db.prepare('SELECT * FROM guild_quarantine WHERE guild_id = ? AND user_id = ?');
const STMT_QUAR_INSERT = db.prepare(`
  INSERT INTO guild_quarantine (guild_id, user_id, quarantined_by, reason, original_roles_json)
  VALUES (?, ?, ?, ?, ?)
`);
const STMT_QUAR_DELETE = db.prepare('DELETE FROM guild_quarantine WHERE guild_id = ? AND user_id = ?');

const STMT_LOCK_INSERT = db.prepare(`
  INSERT OR IGNORE INTO guild_role_locks (guild_id, role_id, locked_by) VALUES (?, ?, ?)
`);
const STMT_LOCK_DELETE = db.prepare('DELETE FROM guild_role_locks WHERE guild_id = ? AND role_id = ?');
const STMT_LOCK_LIST   = db.prepare('SELECT role_id, locked_by, locked_at FROM guild_role_locks WHERE guild_id = ?');

// ─── Cache mémoire pour role locks (lecture chaude dans guildMemberUpdate) ───

/** @type {Map<string, Set<string>>} guildId → Set<roleId> */
const lockedRolesCache = new Map();

function ensureCache(guildId) {
  if (!lockedRolesCache.has(guildId)) {
    const rows = STMT_LOCK_LIST.all(guildId);
    lockedRolesCache.set(guildId, new Set(rows.map(r => r.role_id)));
  }
  return lockedRolesCache.get(guildId);
}

// ─── API : actions de modération ─────────────────────────────────────────────

/**
 * Enregistre une action mod dans l'historique persistant (table dédiée audit-mod).
 * @param {string} guildId
 * @param {string} userId
 * @param {string} moderatorId
 * @param {'WARN'|'UNWARN'|'MUTE'|'UNMUTE'|'KICK'|'BAN'|'UNBAN'|'TIMEOUT'|'QUARANTINE'|'UNQUARANTINE'|'NICK'|string} type
 * @param {string|null} reason
 * @param {number|null} durationMs
 */
function recordModAction(guildId, userId, moderatorId, type, reason = null, durationMs = null) {
  STMT_RECORD_ACTION.run(guildId, userId, moderatorId, String(type).toUpperCase(), reason, durationMs);
}

function getUserHistory(guildId, userId, limit = 20) {
  return STMT_USER_HISTORY.all(guildId, userId, Math.max(1, Math.min(100, limit)));
}

function getUserActionCounts(guildId, userId) {
  const rows = STMT_USER_COUNTS.all(guildId, userId);
  const counts = { WARN: 0, MUTE: 0, KICK: 0, BAN: 0, TIMEOUT: 0, QUARANTINE: 0, OTHER: 0 };
  for (const r of rows) {
    if (counts[r.type] !== undefined) counts[r.type] = r.count;
    else counts.OTHER += r.count;
  }
  return counts;
}

/**
 * Stats agrégées pour ;modstats.
 * @param {string} guildId
 * @param {'24h'|'7d'|'30d'|'all'} period
 */
function getModStats(guildId, period = '7d') {
  const now = Math.floor(Date.now() / 1000);
  const sinceMap = {
    '24h': now - 86400,
    '7d' : now - 7 * 86400,
    '30d': now - 30 * 86400,
    'all': 0,
  };
  const since = sinceMap[period] ?? sinceMap['7d'];

  return {
    period,
    since,
    topMods   : STMT_TOP_MODS.all(guildId, since),
    topActions: STMT_TOP_ACTIONS.all(guildId, since),
    daily     : STMT_DAILY.all(guildId, since),
  };
}

// ─── API : quarantaine ───────────────────────────────────────────────────────

function getQuarantine(guildId, userId) {
  return STMT_QUAR_GET.get(guildId, userId);
}

function quarantineUser(guildId, userId, moderatorId, reason, originalRoleIds) {
  const json = JSON.stringify(originalRoleIds || []);
  STMT_QUAR_INSERT.run(guildId, userId, moderatorId, reason || null, json);
}

/**
 * Libère un user et retourne la liste des rôles à restaurer.
 * @returns {string[]|null} liste des role IDs originaux, ou null si pas en quarantaine
 */
function unquarantineUser(guildId, userId) {
  const row = STMT_QUAR_GET.get(guildId, userId);
  if (!row) return null;
  STMT_QUAR_DELETE.run(guildId, userId);
  try {
    const arr = JSON.parse(row.original_roles_json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ─── API : verrouillage de rôles ─────────────────────────────────────────────

function lockRole(guildId, roleId, moderatorId) {
  STMT_LOCK_INSERT.run(guildId, roleId, moderatorId);
  ensureCache(guildId).add(roleId);
}

function unlockRole(guildId, roleId) {
  STMT_LOCK_DELETE.run(guildId, roleId);
  const set = lockedRolesCache.get(guildId);
  if (set) set.delete(roleId);
}

function isRoleLocked(guildId, roleId) {
  return ensureCache(guildId).has(roleId);
}

function listLockedRoles(guildId) {
  return STMT_LOCK_LIST.all(guildId);
}

function invalidateGuildCache(guildId) {
  lockedRolesCache.delete(guildId);
}

module.exports = {
  recordModAction,
  getUserHistory,
  getUserActionCounts,
  getModStats,

  getQuarantine,
  quarantineUser,
  unquarantineUser,

  lockRole,
  unlockRole,
  isRoleLocked,
  listLockedRoles,
  invalidateGuildCache,
};
