'use strict';

const { db } = require('../database');

const STMT_GET    = db.prepare('SELECT * FROM raidmode_config WHERE guild_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO raidmode_config (guild_id, active, join_threshold, join_window_sec, action, enabled_by, enabled_at, auto_disable)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    active          = excluded.active,
    join_threshold  = excluded.join_threshold,
    join_window_sec = excluded.join_window_sec,
    action          = excluded.action,
    enabled_by      = excluded.enabled_by,
    enabled_at      = excluded.enabled_at,
    auto_disable    = excluded.auto_disable
`);
const STMT_LOG_DET  = db.prepare('INSERT INTO raidmode_detections (guild_id, user_id, user_tag, action) VALUES (?, ?, ?, ?)');
const STMT_GET_DETS = db.prepare('SELECT * FROM raidmode_detections WHERE guild_id = ? ORDER BY joined_at DESC LIMIT 10');
const STMT_CLR_DETS = db.prepare('DELETE FROM raidmode_detections WHERE guild_id = ?');

// Fenêtres de détection en mémoire (guildId → [timestamp, ...])
const joinWindows = new Map();

function getRaidmodeConfig(guildId) {
  return STMT_GET.get(guildId);
}

function updateRaidmodeConfig(guildId, updates, updatedBy = null) {
  const cur = getRaidmodeConfig(guildId) || {
    active: 0, join_threshold: 5, join_window_sec: 10, action: 'kick', auto_disable: 1,
  };
  STMT_UPSERT.run(
    guildId,
    updates.active          ?? cur.active,
    updates.join_threshold  ?? cur.join_threshold,
    updates.join_window_sec ?? cur.join_window_sec,
    updates.action          ?? cur.action,
    updatedBy               ?? cur.enabled_by,
    updates.active ? Math.floor(Date.now() / 1000) : (cur.enabled_at ?? null),
    updates.auto_disable    ?? cur.auto_disable,
  );
}

/**
 * Enregistre un join et retourne true si le seuil de raid est atteint.
 */
function trackJoin(guildId, threshold, windowSec) {
  const now    = Date.now();
  const window = windowSec * 1000;
  const joins  = (joinWindows.get(guildId) || []).filter(ts => now - ts < window);
  joins.push(now);
  joinWindows.set(guildId, joins);
  return joins.length >= threshold;
}

function logDetection(guildId, userId, userTag, action) {
  STMT_LOG_DET.run(guildId, userId, userTag, action);
}

function getRecentDetections(guildId) { return STMT_GET_DETS.all(guildId); }
function clearDetections(guildId)     { STMT_CLR_DETS.run(guildId); }

const VALID_ACTIONS = ['kick', 'ban', 'timeout'];

module.exports = { getRaidmodeConfig, updateRaidmodeConfig, trackJoin, logDetection, getRecentDetections, clearDetections, VALID_ACTIONS };
