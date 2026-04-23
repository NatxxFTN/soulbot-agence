'use strict';

const { db } = require('../database');

// ── Tables ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS pairup_config (
    guild_id     TEXT    PRIMARY KEY,
    channel_id   TEXT,
    role_id      TEXT,
    frequency    TEXT    NOT NULL DEFAULT 'weekly',
    last_run_at  INTEGER,
    enabled      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS pairup_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT    NOT NULL,
    user1_id   TEXT    NOT NULL,
    user2_id   TEXT    NOT NULL,
    paired_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pairup_hist_g1 ON pairup_history(guild_id, user1_id, paired_at DESC);
  CREATE INDEX IF NOT EXISTS idx_pairup_hist_g2 ON pairup_history(guild_id, user2_id, paired_at DESC);
`);

function getConfig(guildId) {
  try {
    return db.prepare('SELECT * FROM pairup_config WHERE guild_id = ?').get(guildId) || null;
  } catch (err) {
    console.error('[pairup-storage] getConfig:', err);
    return null;
  }
}

function setConfig(guildId, patch) {
  try {
    const cur = getConfig(guildId) || {
      guild_id: guildId,
      channel_id: null,
      role_id: null,
      frequency: 'weekly',
      last_run_at: null,
      enabled: 1,
    };
    const merged = { ...cur, ...patch, guild_id: guildId };
    db.prepare(`
      INSERT INTO pairup_config (guild_id, channel_id, role_id, frequency, last_run_at, enabled)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id  = excluded.channel_id,
        role_id     = excluded.role_id,
        frequency   = excluded.frequency,
        last_run_at = excluded.last_run_at,
        enabled     = excluded.enabled
    `).run(
      guildId,
      merged.channel_id,
      merged.role_id,
      merged.frequency || 'weekly',
      merged.last_run_at,
      merged.enabled ? 1 : 0,
    );
    return true;
  } catch (err) {
    console.error('[pairup-storage] setConfig:', err);
    return false;
  }
}

function updateLastRun(guildId, ts = Date.now()) {
  try {
    db.prepare('UPDATE pairup_config SET last_run_at = ? WHERE guild_id = ?').run(ts, guildId);
    return true;
  } catch (err) {
    console.error('[pairup-storage] updateLastRun:', err);
    return false;
  }
}

function recordPairing(guildId, u1, u2) {
  try {
    db.prepare(`
      INSERT INTO pairup_history (guild_id, user1_id, user2_id, paired_at)
      VALUES (?, ?, ?, ?)
    `).run(guildId, u1, u2, Date.now());
    return true;
  } catch (err) {
    console.error('[pairup-storage] recordPairing:', err);
    return false;
  }
}

/** Retourne l'ensemble des userId avec qui userId a été pairé depuis sinceMs. */
function getRecentPairings(guildId, userId, sinceMs) {
  try {
    const since = Date.now() - sinceMs;
    const rows = db.prepare(`
      SELECT user1_id, user2_id FROM pairup_history
      WHERE guild_id = ? AND paired_at >= ?
        AND (user1_id = ? OR user2_id = ?)
    `).all(guildId, since, userId, userId);
    const set = new Set();
    for (const r of rows) {
      if (r.user1_id === userId) set.add(r.user2_id);
      else set.add(r.user1_id);
    }
    return set;
  } catch (err) {
    console.error('[pairup-storage] getRecentPairings:', err);
    return new Set();
  }
}

/** Historique d'un utilisateur (ses N derniers matchs). */
function getUserHistory(guildId, userId, limit = 20) {
  try {
    return db.prepare(`
      SELECT * FROM pairup_history
      WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)
      ORDER BY paired_at DESC
      LIMIT ?
    `).all(guildId, userId, userId, limit);
  } catch (err) {
    console.error('[pairup-storage] getUserHistory:', err);
    return [];
  }
}

function listEnabledConfigs() {
  try {
    return db.prepare(
      'SELECT * FROM pairup_config WHERE enabled = 1 AND channel_id IS NOT NULL AND role_id IS NOT NULL'
    ).all();
  } catch (err) {
    console.error('[pairup-storage] listEnabledConfigs:', err);
    return [];
  }
}

module.exports = {
  getConfig,
  setConfig,
  updateLastRun,
  recordPairing,
  getRecentPairings,
  getUserHistory,
  listEnabledConfigs,
};
