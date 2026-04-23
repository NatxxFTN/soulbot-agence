'use strict';

// ── Security Storage — infrastructure sécurité Soulbot (Pack Forteresse) ──────
// 5 tables : security_config · security_whitelist · security_logs ·
//            security_stats · security_blacklist
// Scope : par guild_id. Partagé entre toutes les features anti-*.

const { db } = require('../database');

const KNOWN_FEATURES = [
  'antilink', 'antiinvite', 'antieveryone', 'antimention', 'antibot',
  'antiduplicate', 'antiwords', 'anticaps', 'antiemojispam', 'antinsfw',
  'antinewaccount', 'antiraid',
];

db.exec(`
  CREATE TABLE IF NOT EXISTS security_config (
    guild_id     TEXT    NOT NULL,
    feature      TEXT    NOT NULL,
    enabled      INTEGER NOT NULL DEFAULT 0,
    action       TEXT    NOT NULL DEFAULT 'delete',
    threshold    INTEGER NOT NULL DEFAULT 1,
    custom_data  TEXT,
    updated_at   INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    PRIMARY KEY (guild_id, feature)
  );

  CREATE TABLE IF NOT EXISTS security_whitelist (
    guild_id     TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL,
    feature      TEXT,
    added_by     TEXT NOT NULL,
    added_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS security_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    feature         TEXT NOT NULL,
    action_taken    TEXT NOT NULL,
    message_content TEXT,
    channel_id      TEXT,
    triggered_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS security_stats (
    guild_id       TEXT NOT NULL,
    feature        TEXT NOT NULL,
    trigger_count  INTEGER NOT NULL DEFAULT 0,
    last_triggered INTEGER,
    PRIMARY KEY (guild_id, feature)
  );

  CREATE TABLE IF NOT EXISTS security_blacklist (
    guild_id  TEXT    NOT NULL,
    user_id   TEXT    NOT NULL,
    reason    TEXT,
    added_by  TEXT    NOT NULL,
    added_at  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_sec_config_guild    ON security_config(guild_id);
  CREATE INDEX IF NOT EXISTS idx_sec_whitelist_guild ON security_whitelist(guild_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sec_wl_unique ON security_whitelist(guild_id, entity_type, entity_id, IFNULL(feature, ''));
  CREATE INDEX IF NOT EXISTS idx_sec_logs_guild      ON security_logs(guild_id);
  CREATE INDEX IF NOT EXISTS idx_sec_logs_date       ON security_logs(triggered_at);
`);

// ─── Prepared statements ─────────────────────────────────────────────────────

const STMT_CONFIG_GET = db.prepare('SELECT * FROM security_config WHERE guild_id = ? AND feature = ?');
const STMT_CONFIG_ALL = db.prepare('SELECT * FROM security_config WHERE guild_id = ?');
const STMT_CONFIG_UPSERT = db.prepare(`
  INSERT INTO security_config (guild_id, feature, enabled, action, threshold, custom_data, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(guild_id, feature) DO UPDATE SET
    enabled     = excluded.enabled,
    action      = excluded.action,
    threshold   = excluded.threshold,
    custom_data = excluded.custom_data,
    updated_at  = excluded.updated_at
`);

const STMT_WL_ADD    = db.prepare('INSERT OR IGNORE INTO security_whitelist (guild_id, entity_type, entity_id, feature, added_by, added_at) VALUES (?, ?, ?, ?, ?, ?)');
const STMT_WL_DEL    = db.prepare('DELETE FROM security_whitelist WHERE guild_id = ? AND entity_type = ? AND entity_id = ? AND IFNULL(feature, \'\') = IFNULL(?, \'\')');
const STMT_WL_CHECK  = db.prepare('SELECT 1 FROM security_whitelist WHERE guild_id = ? AND entity_type = ? AND entity_id = ? AND (feature IS NULL OR feature = ?)');
const STMT_WL_LIST   = db.prepare('SELECT * FROM security_whitelist WHERE guild_id = ? ORDER BY added_at DESC');
const STMT_WL_COUNT  = db.prepare('SELECT entity_type AS type, COUNT(*) AS n FROM security_whitelist WHERE guild_id = ? GROUP BY entity_type');

const STMT_LOG_INSERT      = db.prepare('INSERT INTO security_logs (guild_id, user_id, feature, action_taken, message_content, channel_id, triggered_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
const STMT_LOG_RECENT      = db.prepare('SELECT * FROM security_logs WHERE guild_id = ? ORDER BY triggered_at DESC LIMIT ?');
const STMT_LOG_BY_FEATURE  = db.prepare('SELECT * FROM security_logs WHERE guild_id = ? AND feature = ? ORDER BY triggered_at DESC LIMIT ?');
const STMT_LOG_BY_USER     = db.prepare('SELECT * FROM security_logs WHERE guild_id = ? AND user_id = ? ORDER BY triggered_at DESC LIMIT ?');

const STMT_STATS_INC = db.prepare(`
  INSERT INTO security_stats (guild_id, feature, trigger_count, last_triggered)
  VALUES (?, ?, 1, ?)
  ON CONFLICT(guild_id, feature) DO UPDATE SET
    trigger_count  = trigger_count + 1,
    last_triggered = excluded.last_triggered
`);
const STMT_STATS_ALL     = db.prepare('SELECT * FROM security_stats WHERE guild_id = ?');
const STMT_STATS_FEATURE = db.prepare('SELECT * FROM security_stats WHERE guild_id = ? AND feature = ?');
const STMT_STATS_RESET_ALL     = db.prepare('DELETE FROM security_stats WHERE guild_id = ?');
const STMT_STATS_RESET_FEATURE = db.prepare('DELETE FROM security_stats WHERE guild_id = ? AND feature = ?');

const STMT_BL_ADD   = db.prepare('INSERT OR REPLACE INTO security_blacklist (guild_id, user_id, reason, added_by, added_at) VALUES (?, ?, ?, ?, ?)');
const STMT_BL_DEL   = db.prepare('DELETE FROM security_blacklist WHERE guild_id = ? AND user_id = ?');
const STMT_BL_CHECK = db.prepare('SELECT 1 FROM security_blacklist WHERE guild_id = ? AND user_id = ?');
const STMT_BL_LIST  = db.prepare('SELECT * FROM security_blacklist WHERE guild_id = ? ORDER BY added_at DESC');

// ─── Config ──────────────────────────────────────────────────────────────────

function getConfig(guildId, feature) {
  try {
    return STMT_CONFIG_GET.get(guildId, feature) || null;
  } catch (err) { console.error('[sec-storage] getConfig:', err); return null; }
}

function setConfig(guildId, feature, partial = {}) {
  try {
    const current = STMT_CONFIG_GET.get(guildId, feature) || {};
    const merged = {
      enabled    : partial.enabled    ?? current.enabled    ?? 0,
      action     : partial.action     ?? current.action     ?? 'delete',
      threshold  : partial.threshold  ?? current.threshold  ?? 1,
      custom_data: partial.custom_data ?? current.custom_data ?? null,
    };
    STMT_CONFIG_UPSERT.run(
      guildId, feature,
      merged.enabled ? 1 : 0,
      merged.action,
      merged.threshold,
      merged.custom_data,
      Date.now(),
    );
  } catch (err) { console.error('[sec-storage] setConfig:', err); }
}

function getAllFeatures(guildId) {
  try {
    const rows = STMT_CONFIG_ALL.all(guildId);
    return rows;
  } catch (err) { console.error('[sec-storage] getAllFeatures:', err); return []; }
}

function toggleFeature(guildId, feature) {
  const current = getConfig(guildId, feature);
  const newEnabled = current?.enabled ? 0 : 1;
  setConfig(guildId, feature, { ...current, enabled: newEnabled });
  return !!newEnabled;
}

// ─── Whitelist ────────────────────────────────────────────────────────────────

function addWhitelist(guildId, type, id, feature = null, addedBy) {
  try {
    const res = STMT_WL_ADD.run(guildId, type, id, feature, addedBy, Date.now());
    return res.changes > 0;
  } catch (err) { console.error('[sec-storage] addWhitelist:', err); return false; }
}

function removeWhitelist(guildId, type, id, feature = null) {
  try {
    const res = STMT_WL_DEL.run(guildId, type, id, feature);
    return res.changes > 0;
  } catch (err) { console.error('[sec-storage] removeWhitelist:', err); return false; }
}

function isWhitelisted(guildId, type, id, feature = null) {
  try {
    return !!STMT_WL_CHECK.get(guildId, type, id, feature);
  } catch (err) { console.error('[sec-storage] isWhitelisted:', err); return false; }
}

function listWhitelist(guildId, typeFilter = null, featureFilter = null) {
  try {
    let rows = STMT_WL_LIST.all(guildId);
    if (typeFilter)    rows = rows.filter(r => r.entity_type === typeFilter);
    if (featureFilter) rows = rows.filter(r => r.feature === featureFilter);
    return rows;
  } catch (err) { console.error('[sec-storage] listWhitelist:', err); return []; }
}

function countWhitelist(guildId) {
  const result = { users: 0, roles: 0, channels: 0 };
  try {
    const rows = STMT_WL_COUNT.all(guildId);
    for (const r of rows) {
      if (r.type === 'user')    result.users    = r.n;
      if (r.type === 'role')    result.roles    = r.n;
      if (r.type === 'channel') result.channels = r.n;
    }
  } catch (err) { console.error('[sec-storage] countWhitelist:', err); }
  return result;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

function logAction(guildId, userId, feature, action, messageContent, channelId) {
  try {
    STMT_LOG_INSERT.run(guildId, userId, feature, action, messageContent || null, channelId || null, Date.now());
  } catch (err) { console.error('[sec-storage] logAction:', err); }
}

function getRecentLogs(guildId, limit = 50) {
  try { return STMT_LOG_RECENT.all(guildId, limit); }
  catch (err) { console.error('[sec-storage] getRecentLogs:', err); return []; }
}

function getLogsByFeature(guildId, feature, limit = 50) {
  try { return STMT_LOG_BY_FEATURE.all(guildId, feature, limit); }
  catch (err) { console.error('[sec-storage] getLogsByFeature:', err); return []; }
}

function getLogsByUser(guildId, userId, limit = 50) {
  try { return STMT_LOG_BY_USER.all(guildId, userId, limit); }
  catch (err) { console.error('[sec-storage] getLogsByUser:', err); return []; }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function incrementStat(guildId, feature) {
  try { STMT_STATS_INC.run(guildId, feature, Date.now()); }
  catch (err) { console.error('[sec-storage] incrementStat:', err); }
}

function getStats(guildId) {
  try { return STMT_STATS_ALL.all(guildId); }
  catch (err) { console.error('[sec-storage] getStats:', err); return []; }
}

function getStatsFeature(guildId, feature) {
  try { return STMT_STATS_FEATURE.get(guildId, feature) || null; }
  catch (err) { console.error('[sec-storage] getStatsFeature:', err); return null; }
}

function resetStats(guildId, feature = null) {
  try {
    if (feature) STMT_STATS_RESET_FEATURE.run(guildId, feature);
    else         STMT_STATS_RESET_ALL.run(guildId);
  } catch (err) { console.error('[sec-storage] resetStats:', err); }
}

// ─── Blacklist ────────────────────────────────────────────────────────────────

function addBlacklist(guildId, userId, reason, addedBy) {
  try {
    STMT_BL_ADD.run(guildId, userId, reason || null, addedBy, Date.now());
    return true;
  } catch (err) { console.error('[sec-storage] addBlacklist:', err); return false; }
}

function removeBlacklist(guildId, userId) {
  try { return STMT_BL_DEL.run(guildId, userId).changes > 0; }
  catch (err) { console.error('[sec-storage] removeBlacklist:', err); return false; }
}

function isBlacklisted(guildId, userId) {
  try { return !!STMT_BL_CHECK.get(guildId, userId); }
  catch (err) { console.error('[sec-storage] isBlacklisted:', err); return false; }
}

function listBlacklist(guildId) {
  try { return STMT_BL_LIST.all(guildId); }
  catch (err) { console.error('[sec-storage] listBlacklist:', err); return []; }
}

module.exports = {
  KNOWN_FEATURES,
  // Config
  getConfig, setConfig, getAllFeatures, toggleFeature,
  // Whitelist
  addWhitelist, removeWhitelist, isWhitelisted, listWhitelist, countWhitelist,
  // Logs
  logAction, getRecentLogs, getLogsByFeature, getLogsByUser,
  // Stats
  incrementStat, getStats, getStatsFeature, resetStats,
  // Blacklist
  addBlacklist, removeBlacklist, isBlacklisted, listBlacklist,
};
