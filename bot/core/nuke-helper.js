'use strict';

const { db } = require('../database');

// Cooldowns par mode (ms)
const COOLDOWNS = {
  classique : 60 * 60 * 1000,  // 1h
  rapide    : 30 * 60 * 1000,  // 30min
  urgence   : 5  * 60 * 1000,  // 5min
};

const STMT_GET_CFG    = db.prepare('SELECT * FROM nuke_config WHERE guild_id = ?');
const STMT_UPSERT_CFG = db.prepare(`
  INSERT INTO nuke_config (guild_id, targets_channels, targets_roles, targets_emojis, updated_at, updated_by)
  VALUES (?, ?, ?, ?, unixepoch(), ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    targets_channels = excluded.targets_channels,
    targets_roles    = excluded.targets_roles,
    targets_emojis   = excluded.targets_emojis,
    updated_at       = excluded.updated_at,
    updated_by       = excluded.updated_by
`);
const STMT_GET_CD   = db.prepare('SELECT last_reset_at FROM reset_cooldowns WHERE guild_id = ?');
const STMT_SET_CD   = db.prepare(`
  INSERT INTO reset_cooldowns (guild_id, last_reset_at)
  VALUES (?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET last_reset_at = excluded.last_reset_at
`);
const STMT_LOG = db.prepare(`
  INSERT INTO reset_logs
    (guild_id, guild_name, user_id, auto_backup_name, channels_deleted, roles_deleted, emojis_deleted, duration_ms, success, error)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const STMT_RECENT_LOGS = db.prepare(
  'SELECT * FROM reset_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 5'
);

function getNukeConfig(guildId) {
  return STMT_GET_CFG.get(guildId);
}

function updateNukeConfig(guildId, updates, updatedBy = null) {
  const current = getNukeConfig(guildId) || {
    targets_channels: 1,
    targets_roles   : 1,
    targets_emojis  : 1,
  };
  STMT_UPSERT_CFG.run(
    guildId,
    updates.targets_channels ?? current.targets_channels,
    updates.targets_roles    ?? current.targets_roles,
    updates.targets_emojis   ?? current.targets_emojis,
    updatedBy,
  );
}

/**
 * Vérifie si un cooldown est actif.
 * @returns {{ active: boolean, remainingMs: number }}
 */
function checkCooldown(guildId, mode) {
  const row = STMT_GET_CD.get(guildId);
  if (!row) return { active: false, remainingMs: 0 };
  const remaining = COOLDOWNS[mode] - (Date.now() - row.last_reset_at);
  return remaining > 0
    ? { active: true, remainingMs: remaining }
    : { active: false, remainingMs: 0 };
}

function markNukeExecuted(guildId) {
  STMT_SET_CD.run(guildId, Date.now());
}

function logNuke({ guildId, guildName, userId, backupName, channelsDeleted, rolesDeleted, emojisDeleted, durationMs, success, error }) {
  STMT_LOG.run(guildId, guildName, userId, backupName || '', channelsDeleted || 0, rolesDeleted || 0, emojisDeleted || 0, durationMs || 0, success ? 1 : 0, error || null);
}

function getRecentNukes(guildId) {
  return STMT_RECENT_LOGS.all(guildId);
}

module.exports = { COOLDOWNS, getNukeConfig, updateNukeConfig, checkCooldown, markNukeExecuted, logNuke, getRecentNukes };
