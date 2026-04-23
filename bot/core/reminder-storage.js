'use strict';

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT    NOT NULL,
    channel_id      TEXT    NOT NULL,
    message_content TEXT    NOT NULL,
    name            TEXT,
    trigger_at      INTEGER NOT NULL,
    recurring       TEXT,
    ping_role_id    TEXT,
    created_by      TEXT    NOT NULL,
    created_at      INTEGER NOT NULL,
    last_triggered  INTEGER,
    enabled         INTEGER NOT NULL DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_reminders_guild     ON reminders(guild_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_trigger   ON reminders(enabled, trigger_at);
`);

function createReminder(data) {
  try {
    const res = db.prepare(`
      INSERT INTO reminders (
        guild_id, channel_id, message_content, name,
        trigger_at, recurring, ping_role_id,
        created_by, created_at, last_triggered, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.guild_id,
      data.channel_id,
      data.message_content,
      data.name || null,
      data.trigger_at,
      data.recurring || null,
      data.ping_role_id || null,
      data.created_by,
      Date.now(),
      null,
      data.enabled === false ? 0 : 1,
    );
    return res.lastInsertRowid;
  } catch (err) {
    console.error('[reminder-storage] createReminder:', err);
    return null;
  }
}

function getReminder(id) {
  try {
    return db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) || null;
  } catch (err) {
    console.error('[reminder-storage] getReminder:', err);
    return null;
  }
}

function listReminders(guildId) {
  try {
    return db.prepare(`
      SELECT * FROM reminders
      WHERE guild_id = ?
      ORDER BY trigger_at ASC
    `).all(guildId);
  } catch (err) {
    console.error('[reminder-storage] listReminders:', err);
    return [];
  }
}

function deleteReminder(id) {
  try {
    const res = db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    return res.changes > 0;
  } catch (err) {
    console.error('[reminder-storage] deleteReminder:', err);
    return false;
  }
}

function getExpiringReminders() {
  try {
    const now = Date.now();
    return db.prepare(`
      SELECT * FROM reminders
      WHERE enabled = 1 AND trigger_at <= ?
      ORDER BY trigger_at ASC
      LIMIT 50
    `).all(now);
  } catch (err) {
    console.error('[reminder-storage] getExpiringReminders:', err);
    return [];
  }
}

function updateReminder(id, patch) {
  try {
    const cur = getReminder(id);
    if (!cur) return false;
    const merged = { ...cur, ...patch };
    db.prepare(`
      UPDATE reminders SET
        channel_id = ?, message_content = ?, name = ?,
        trigger_at = ?, recurring = ?, ping_role_id = ?,
        last_triggered = ?, enabled = ?
      WHERE id = ?
    `).run(
      merged.channel_id,
      merged.message_content,
      merged.name,
      merged.trigger_at,
      merged.recurring,
      merged.ping_role_id,
      merged.last_triggered,
      merged.enabled ? 1 : 0,
      id,
    );
    return true;
  } catch (err) {
    console.error('[reminder-storage] updateReminder:', err);
    return false;
  }
}

function toggleReminder(id) {
  try {
    const cur = getReminder(id);
    if (!cur) return false;
    db.prepare('UPDATE reminders SET enabled = ? WHERE id = ?').run(cur.enabled ? 0 : 1, id);
    return true;
  } catch (err) {
    console.error('[reminder-storage] toggleReminder:', err);
    return false;
  }
}

module.exports = {
  createReminder,
  getReminder,
  listReminders,
  deleteReminder,
  getExpiringReminders,
  updateReminder,
  toggleReminder,
};
