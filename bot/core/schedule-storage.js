'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE STORAGE — persistance des actions programmées
// Table : schedules
// Actions supportées : ban, kick, unban, role_add, role_remove, message
// ═══════════════════════════════════════════════════════════════════════════

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS schedules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT    NOT NULL,
    target_id   TEXT    NOT NULL,
    action      TEXT    NOT NULL,
    params      TEXT,
    execute_at  INTEGER NOT NULL,
    author_id   TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending',
    reason      TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_schedules_due    ON schedules(status, execute_at);
  CREATE INDEX IF NOT EXISTS idx_schedules_guild  ON schedules(guild_id, status);
`);

/**
 * Parse "2h", "30m", "1d", "3600s" → ms
 * Retourne null si format invalide.
 */
function parseDelay(input) {
  if (!input) return null;
  const m = String(input).trim().toLowerCase().match(/^(\d+)\s*(s|sec|m|min|h|d|j)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = m[2];
  if (u.startsWith('s')) return n * 1000;
  if (u === 'm' || u === 'min') return n * 60_000;
  if (u === 'h') return n * 3_600_000;
  if (u === 'd' || u === 'j') return n * 86_400_000;
  return null;
}

function createSchedule(data) {
  try {
    const res = db.prepare(`
      INSERT INTO schedules (guild_id, target_id, action, params, execute_at, author_id, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      data.guildId,
      data.targetId,
      data.action,
      data.params ? JSON.stringify(data.params) : null,
      data.executeAt,
      data.authorId,
      data.reason || null,
    );
    return res.lastInsertRowid;
  } catch (err) {
    console.error('[schedule-storage] createSchedule:', err);
    return null;
  }
}

function listPending(guildId) {
  try {
    return db.prepare(`
      SELECT * FROM schedules
      WHERE guild_id = ? AND status = 'pending'
      ORDER BY execute_at ASC
    `).all(guildId);
  } catch (err) {
    console.error('[schedule-storage] listPending:', err);
    return [];
  }
}

function getDue() {
  try {
    return db.prepare(`
      SELECT * FROM schedules
      WHERE status = 'pending' AND execute_at <= ?
      ORDER BY execute_at ASC
      LIMIT 20
    `).all(Date.now());
  } catch (err) {
    console.error('[schedule-storage] getDue:', err);
    return [];
  }
}

function markExecuted(id) {
  try {
    db.prepare('UPDATE schedules SET status = ? WHERE id = ?').run('executed', id);
    return true;
  } catch { return false; }
}

function markFailed(id, err) {
  try {
    db.prepare('UPDATE schedules SET status = ?, reason = ? WHERE id = ?')
      .run('failed', String(err).slice(0, 300), id);
    return true;
  } catch { return false; }
}

function cancel(id, guildId) {
  try {
    const res = db.prepare(`
      UPDATE schedules SET status = 'cancelled'
      WHERE id = ? AND guild_id = ? AND status = 'pending'
    `).run(id, guildId);
    return res.changes > 0;
  } catch { return false; }
}

function getById(id) {
  try {
    return db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) || null;
  } catch { return null; }
}

module.exports = {
  parseDelay,
  createSchedule,
  listPending,
  getDue,
  markExecuted,
  markFailed,
  cancel,
  getById,
};
