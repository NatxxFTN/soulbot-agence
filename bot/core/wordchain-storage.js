'use strict';

const { db } = require('../database');

// ── Tables ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS wordchain_config (
    guild_id            TEXT    PRIMARY KEY,
    channel_id          TEXT,
    current_chain       INTEGER NOT NULL DEFAULT 0,
    best_chain          INTEGER NOT NULL DEFAULT 0,
    best_chain_ended_at INTEGER,
    last_letter         TEXT,
    last_user_id        TEXT,
    enabled             INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS wordchain_stats (
    guild_id      TEXT    NOT NULL,
    user_id       TEXT    NOT NULL,
    contributions INTEGER NOT NULL DEFAULT 0,
    breaks        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_wc_stats_guild ON wordchain_stats(guild_id, contributions DESC);
`);

function getConfig(guildId) {
  try {
    return db.prepare('SELECT * FROM wordchain_config WHERE guild_id = ?').get(guildId) || null;
  } catch (err) {
    console.error('[wordchain-storage] getConfig:', err);
    return null;
  }
}

function setConfig(guildId, patch) {
  try {
    const cur = getConfig(guildId) || {
      guild_id: guildId,
      channel_id: null,
      current_chain: 0,
      best_chain: 0,
      best_chain_ended_at: null,
      last_letter: null,
      last_user_id: null,
      enabled: 1,
    };
    const merged = { ...cur, ...patch, guild_id: guildId };
    db.prepare(`
      INSERT INTO wordchain_config (
        guild_id, channel_id, current_chain, best_chain, best_chain_ended_at,
        last_letter, last_user_id, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id          = excluded.channel_id,
        current_chain       = excluded.current_chain,
        best_chain          = excluded.best_chain,
        best_chain_ended_at = excluded.best_chain_ended_at,
        last_letter         = excluded.last_letter,
        last_user_id        = excluded.last_user_id,
        enabled             = excluded.enabled
    `).run(
      guildId,
      merged.channel_id,
      parseInt(merged.current_chain, 10) || 0,
      parseInt(merged.best_chain, 10) || 0,
      merged.best_chain_ended_at || null,
      merged.last_letter || null,
      merged.last_user_id || null,
      merged.enabled ? 1 : 0,
    );
    return true;
  } catch (err) {
    console.error('[wordchain-storage] setConfig:', err);
    return false;
  }
}

function getChannel(guildId) {
  const cfg = getConfig(guildId);
  return cfg?.channel_id || null;
}

function incrementContribution(guildId, userId) {
  try {
    db.prepare(`
      INSERT INTO wordchain_stats (guild_id, user_id, contributions, breaks)
      VALUES (?, ?, 1, 0)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        contributions = contributions + 1
    `).run(guildId, userId);
    return true;
  } catch (err) {
    console.error('[wordchain-storage] incrementContribution:', err);
    return false;
  }
}

function incrementBreak(guildId, userId) {
  try {
    db.prepare(`
      INSERT INTO wordchain_stats (guild_id, user_id, contributions, breaks)
      VALUES (?, ?, 0, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        breaks = breaks + 1
    `).run(guildId, userId);
    return true;
  } catch (err) {
    console.error('[wordchain-storage] incrementBreak:', err);
    return false;
  }
}

function listTop(guildId, limit = 10) {
  try {
    return db.prepare(`
      SELECT * FROM wordchain_stats
      WHERE guild_id = ?
      ORDER BY contributions DESC, breaks ASC
      LIMIT ?
    `).all(guildId, limit);
  } catch (err) {
    console.error('[wordchain-storage] listTop:', err);
    return [];
  }
}

function getUserStats(guildId, userId) {
  try {
    return db.prepare(
      'SELECT * FROM wordchain_stats WHERE guild_id = ? AND user_id = ?'
    ).get(guildId, userId) || { contributions: 0, breaks: 0 };
  } catch {
    return { contributions: 0, breaks: 0 };
  }
}

function resetChain(guildId) {
  return setConfig(guildId, {
    current_chain: 0,
    last_letter: null,
    last_user_id: null,
  });
}

function updateChain(guildId, patch) {
  return setConfig(guildId, patch);
}

module.exports = {
  getConfig,
  setConfig,
  getChannel,
  incrementContribution,
  incrementBreak,
  listTop,
  getUserStats,
  resetChain,
  updateChain,
};
