'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// FREEZE STORAGE — gel serveur (panic mode)
// Table freezes : état actuel par guilde
// Table freeze_snapshots : snapshot des perms par salon avant gel
// ═══════════════════════════════════════════════════════════════════════════

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS freezes (
    guild_id     TEXT PRIMARY KEY,
    frozen_at    INTEGER NOT NULL,
    expires_at   INTEGER,
    author_id    TEXT NOT NULL,
    reason       TEXT
  );
  CREATE TABLE IF NOT EXISTS freeze_snapshots (
    guild_id     TEXT NOT NULL,
    channel_id   TEXT NOT NULL,
    allow        TEXT,
    deny         TEXT,
    had_override INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, channel_id)
  );
`);

function createFreeze(guildId, authorId, expiresAt, reason) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO freezes (guild_id, frozen_at, expires_at, author_id, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(guildId, Date.now(), expiresAt || null, authorId, reason || null);
    return true;
  } catch (err) {
    console.error('[freeze-storage] createFreeze:', err);
    return false;
  }
}

function saveSnapshot(guildId, channelId, allow, deny, hadOverride) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO freeze_snapshots (guild_id, channel_id, allow, deny, had_override)
      VALUES (?, ?, ?, ?, ?)
    `).run(guildId, channelId, allow, deny, hadOverride ? 1 : 0);
  } catch (err) {
    console.error('[freeze-storage] saveSnapshot:', err);
  }
}

function getSnapshots(guildId) {
  try {
    return db.prepare('SELECT * FROM freeze_snapshots WHERE guild_id = ?').all(guildId);
  } catch { return []; }
}

function getFreeze(guildId) {
  try {
    return db.prepare('SELECT * FROM freezes WHERE guild_id = ?').get(guildId) || null;
  } catch { return null; }
}

function clearFreeze(guildId) {
  try {
    db.prepare('DELETE FROM freezes WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM freeze_snapshots WHERE guild_id = ?').run(guildId);
  } catch (err) { console.error('[freeze-storage] clearFreeze:', err); }
}

function getExpiredFreezes() {
  try {
    return db.prepare(`
      SELECT * FROM freezes
      WHERE expires_at IS NOT NULL AND expires_at <= ?
    `).all(Date.now());
  } catch { return []; }
}

module.exports = {
  createFreeze, saveSnapshot, getSnapshots, getFreeze, clearFreeze, getExpiredFreezes,
};
