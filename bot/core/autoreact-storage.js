'use strict';

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS autoreact (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT    NOT NULL,
    channel_id  TEXT    NOT NULL,
    emojis      TEXT    NOT NULL DEFAULT '[]',
    ignore_bots INTEGER NOT NULL DEFAULT 1,
    added_by    TEXT    NOT NULL,
    added_at    INTEGER NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_autoreact_unique ON autoreact(guild_id, channel_id);
  CREATE INDEX IF NOT EXISTS idx_autoreact_channel       ON autoreact(channel_id);
`);

function setAutoreact(guildId, channelId, emojis, addedBy, ignoreBots = 1) {
  try {
    const json = JSON.stringify(Array.isArray(emojis) ? emojis : []);
    db.prepare(`
      INSERT INTO autoreact (guild_id, channel_id, emojis, ignore_bots, added_by, added_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, channel_id) DO UPDATE SET
        emojis      = excluded.emojis,
        ignore_bots = excluded.ignore_bots,
        added_by    = excluded.added_by,
        added_at    = excluded.added_at
    `).run(guildId, channelId, json, ignoreBots ? 1 : 0, addedBy, Date.now());
    return true;
  } catch (err) {
    console.error('[autoreact-storage] setAutoreact:', err);
    return false;
  }
}

function removeAutoreact(guildId, channelId) {
  try {
    const res = db.prepare('DELETE FROM autoreact WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
    return res.changes > 0;
  } catch (err) {
    console.error('[autoreact-storage] removeAutoreact:', err);
    return false;
  }
}

function getAutoreact(channelId) {
  try {
    const row = db.prepare('SELECT * FROM autoreact WHERE channel_id = ?').get(channelId);
    if (!row) return null;
    let emojis = [];
    try { emojis = JSON.parse(row.emojis || '[]'); } catch {}
    return { ...row, emojis };
  } catch (err) {
    console.error('[autoreact-storage] getAutoreact:', err);
    return null;
  }
}

function listAutoreacts(guildId) {
  try {
    const rows = db.prepare('SELECT * FROM autoreact WHERE guild_id = ? ORDER BY added_at DESC').all(guildId);
    return rows.map(r => {
      let emojis = [];
      try { emojis = JSON.parse(r.emojis || '[]'); } catch {}
      return { ...r, emojis };
    });
  } catch (err) {
    console.error('[autoreact-storage] listAutoreacts:', err);
    return [];
  }
}

module.exports = {
  setAutoreact,
  removeAutoreact,
  getAutoreact,
  listAutoreacts,
};
