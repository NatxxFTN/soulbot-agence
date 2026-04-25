'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// NICKNAME HISTORY — 10 derniers changements de pseudo par membre
// ═══════════════════════════════════════════════════════════════════════════

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS nicknames_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    old_nick    TEXT,
    new_nick    TEXT,
    changed_at  INTEGER NOT NULL,
    changed_by  TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_nickhist_user ON nicknames_history(guild_id, user_id, changed_at DESC);
`);

function logChange(guildId, userId, oldNick, newNick, changedBy) {
  try {
    if ((oldNick || '') === (newNick || '')) return;
    db.prepare(`
      INSERT INTO nicknames_history (guild_id, user_id, old_nick, new_nick, changed_at, changed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(guildId, userId, oldNick || null, newNick || null, Date.now(), changedBy || null);

    // Trim à 10 max
    const rows = db.prepare(`
      SELECT id FROM nicknames_history
      WHERE guild_id = ? AND user_id = ?
      ORDER BY changed_at DESC
    `).all(guildId, userId);
    if (rows.length > 10) {
      const idsToDelete = rows.slice(10).map(r => r.id);
      const placeholders = idsToDelete.map(() => '?').join(',');
      db.prepare(`DELETE FROM nicknames_history WHERE id IN (${placeholders})`).run(...idsToDelete);
    }
  } catch (err) {
    console.error('[nickname-history] logChange:', err);
  }
}

function getHistory(guildId, userId, limit = 10) {
  try {
    return db.prepare(`
      SELECT * FROM nicknames_history
      WHERE guild_id = ? AND user_id = ?
      ORDER BY changed_at DESC
      LIMIT ?
    `).all(guildId, userId, limit);
  } catch { return []; }
}

module.exports = { logChange, getHistory };
