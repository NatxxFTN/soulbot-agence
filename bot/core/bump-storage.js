'use strict';

// ── Bump Storage — SQLite persistance du système Bump Disboard ────────────────
// Source canonique : data/bot.db
// Tables : bump_config · bump_history · bump_reminders

const { db } = require('../database');

const BUMP_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h

// ─── Schema (IF NOT EXISTS — idempotent au boot) ─────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS bump_config (
    guild_id       TEXT PRIMARY KEY,
    channel_id     TEXT,
    role_id        TEXT,
    custom_message TEXT,
    enabled        INTEGER NOT NULL DEFAULT 1,
    updated_at     INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS bump_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    bumped_at  INTEGER NOT NULL,
    channel_id TEXT
  );

  CREATE TABLE IF NOT EXISTS bump_reminders (
    guild_id       TEXT PRIMARY KEY,
    next_bump_at   INTEGER NOT NULL,
    reminder_sent  INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_bump_history_guild    ON bump_history(guild_id);
  CREATE INDEX IF NOT EXISTS idx_bump_history_user     ON bump_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_bump_reminders_time   ON bump_reminders(next_bump_at);
`);

// ─── Prepared statements ─────────────────────────────────────────────────────

const STMT_GET_CONFIG = db.prepare('SELECT * FROM bump_config WHERE guild_id = ?');
const STMT_SET_CONFIG = db.prepare(`
  INSERT INTO bump_config (guild_id, channel_id, role_id, custom_message, enabled, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    channel_id     = excluded.channel_id,
    role_id        = excluded.role_id,
    custom_message = excluded.custom_message,
    enabled        = excluded.enabled,
    updated_at     = excluded.updated_at
`);

const STMT_INSERT_HISTORY = db.prepare(
  'INSERT INTO bump_history (guild_id, user_id, bumped_at, channel_id) VALUES (?, ?, ?, ?)'
);

const STMT_UPSERT_REMINDER = db.prepare(`
  INSERT INTO bump_reminders (guild_id, next_bump_at, reminder_sent)
  VALUES (?, ?, 0)
  ON CONFLICT(guild_id) DO UPDATE SET
    next_bump_at  = excluded.next_bump_at,
    reminder_sent = 0
`);

const STMT_GET_LAST_BUMP = db.prepare(
  'SELECT user_id, bumped_at, channel_id FROM bump_history WHERE guild_id = ? ORDER BY bumped_at DESC LIMIT 1'
);
const STMT_GET_NEXT_BUMP = db.prepare(
  'SELECT next_bump_at, reminder_sent FROM bump_reminders WHERE guild_id = ?'
);
const STMT_GET_PENDING = db.prepare(
  'SELECT guild_id, next_bump_at FROM bump_reminders WHERE next_bump_at <= ? AND reminder_sent = 0'
);
const STMT_MARK_SENT = db.prepare(
  'UPDATE bump_reminders SET reminder_sent = 1 WHERE guild_id = ?'
);

const STMT_TOP_ALL = db.prepare(`
  SELECT user_id, COUNT(*) AS count
  FROM bump_history
  WHERE guild_id = ?
  GROUP BY user_id
  ORDER BY count DESC
  LIMIT ?
`);

const STMT_TOP_MONTH = db.prepare(`
  SELECT user_id, COUNT(*) AS count
  FROM bump_history
  WHERE guild_id = ? AND bumped_at >= ?
  GROUP BY user_id
  ORDER BY count DESC
  LIMIT ?
`);

const STMT_TOTAL_GUILD = db.prepare('SELECT COUNT(*) AS n FROM bump_history WHERE guild_id = ?');
const STMT_TOTAL_USER  = db.prepare('SELECT COUNT(*) AS n FROM bump_history WHERE guild_id = ? AND user_id = ?');
const STMT_UNIQUE_BUMPERS = db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM bump_history WHERE guild_id = ?');
const STMT_FIRST_BUMP = db.prepare('SELECT bumped_at FROM bump_history WHERE guild_id = ? ORDER BY bumped_at ASC LIMIT 1');

// ─── API publique ─────────────────────────────────────────────────────────────

function getConfig(guildId) {
  try {
    return STMT_GET_CONFIG.get(guildId) || null;
  } catch (err) {
    console.error('[bump-storage] getConfig:', err);
    return null;
  }
}

function setConfig(guildId, { channel_id = null, role_id = null, custom_message = null, enabled = 1 } = {}) {
  try {
    STMT_SET_CONFIG.run(
      guildId,
      channel_id,
      role_id,
      custom_message,
      enabled ? 1 : 0,
      Date.now(),
    );
  } catch (err) {
    console.error('[bump-storage] setConfig:', err);
  }
}

function recordBump(guildId, userId, channelId) {
  try {
    const now = Date.now();
    STMT_INSERT_HISTORY.run(guildId, userId, now, channelId || null);
    STMT_UPSERT_REMINDER.run(guildId, now + BUMP_COOLDOWN_MS);
  } catch (err) {
    console.error('[bump-storage] recordBump:', err);
  }
}

function getLastBump(guildId) {
  try {
    return STMT_GET_LAST_BUMP.get(guildId) || null;
  } catch (err) {
    console.error('[bump-storage] getLastBump:', err);
    return null;
  }
}

function getNextBump(guildId) {
  try {
    return STMT_GET_NEXT_BUMP.get(guildId) || null;
  } catch (err) {
    console.error('[bump-storage] getNextBump:', err);
    return null;
  }
}

function getPendingReminders() {
  try {
    // Inclut les rappels "dus maintenant" + ceux dans les 60 prochaines secondes
    const cutoff = Date.now() + 60 * 1000;
    return STMT_GET_PENDING.all(cutoff);
  } catch (err) {
    console.error('[bump-storage] getPendingReminders:', err);
    return [];
  }
}

function markReminderSent(guildId) {
  try {
    STMT_MARK_SENT.run(guildId);
  } catch (err) {
    console.error('[bump-storage] markReminderSent:', err);
  }
}

function getTopBumpers(guildId, limit = 10) {
  try {
    return STMT_TOP_ALL.all(guildId, limit);
  } catch (err) {
    console.error('[bump-storage] getTopBumpers:', err);
    return [];
  }
}

function getTopBumpersMonth(guildId, limit = 10) {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return STMT_TOP_MONTH.all(guildId, monthStart, limit);
  } catch (err) {
    console.error('[bump-storage] getTopBumpersMonth:', err);
    return [];
  }
}

function getTotalBumps(guildId) {
  try {
    const row = STMT_TOTAL_GUILD.get(guildId);
    return row?.n ?? 0;
  } catch (err) {
    console.error('[bump-storage] getTotalBumps:', err);
    return 0;
  }
}

function getUserBumps(guildId, userId) {
  try {
    const row = STMT_TOTAL_USER.get(guildId, userId);
    return row?.n ?? 0;
  } catch (err) {
    console.error('[bump-storage] getUserBumps:', err);
    return 0;
  }
}

function getUniqueBumpers(guildId) {
  try {
    const row = STMT_UNIQUE_BUMPERS.get(guildId);
    return row?.n ?? 0;
  } catch (err) {
    console.error('[bump-storage] getUniqueBumpers:', err);
    return 0;
  }
}

function getFirstBump(guildId) {
  try {
    const row = STMT_FIRST_BUMP.get(guildId);
    return row?.bumped_at ?? null;
  } catch (err) {
    console.error('[bump-storage] getFirstBump:', err);
    return null;
  }
}

module.exports = {
  BUMP_COOLDOWN_MS,
  getConfig, setConfig,
  recordBump,
  getLastBump, getNextBump,
  getPendingReminders, markReminderSent,
  getTopBumpers, getTopBumpersMonth,
  getTotalBumps, getUserBumps,
  getUniqueBumpers, getFirstBump,
};
