'use strict';

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS twitch_config (
    guild_id          TEXT PRIMARY KEY,
    channel_id        TEXT,
    ping_role_id      TEXT,
    message_template  TEXT    NOT NULL DEFAULT '🔴 **{streamer}** est en LIVE !\n{title}\n{url}',
    mention_everyone  INTEGER NOT NULL DEFAULT 0,
    enabled           INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS twitch_streamers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id         TEXT    NOT NULL,
    twitch_username  TEXT    NOT NULL COLLATE NOCASE,
    twitch_user_id   TEXT,
    display_name     TEXT,
    added_by         TEXT    NOT NULL,
    last_live_at     INTEGER NOT NULL DEFAULT 0,
    last_live_id     TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_twitch_unique ON twitch_streamers(guild_id, twitch_username);
  CREATE INDEX IF NOT EXISTS idx_twitch_guild         ON twitch_streamers(guild_id);
`);

function getConfig(guildId) {
  try {
    return db.prepare('SELECT * FROM twitch_config WHERE guild_id = ?').get(guildId) || null;
  } catch (err) {
    console.error('[twitch-storage] getConfig:', err);
    return null;
  }
}

function setConfig(guildId, patch) {
  try {
    const cur = getConfig(guildId) || {
      guild_id: guildId,
      channel_id: null,
      ping_role_id: null,
      message_template: '🔴 **{streamer}** est en LIVE !\n{title}\n{url}',
      mention_everyone: 0,
      enabled: 1,
    };
    const merged = { ...cur, ...patch, guild_id: guildId };
    db.prepare(`
      INSERT INTO twitch_config (
        guild_id, channel_id, ping_role_id, message_template, mention_everyone, enabled
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id       = excluded.channel_id,
        ping_role_id     = excluded.ping_role_id,
        message_template = excluded.message_template,
        mention_everyone = excluded.mention_everyone,
        enabled          = excluded.enabled
    `).run(
      guildId,
      merged.channel_id,
      merged.ping_role_id,
      merged.message_template,
      merged.mention_everyone ? 1 : 0,
      merged.enabled ? 1 : 0,
    );
    return true;
  } catch (err) {
    console.error('[twitch-storage] setConfig:', err);
    return false;
  }
}

function addStreamer(guildId, username, addedBy, displayName, twitchUserId) {
  try {
    const low = username.toLowerCase();
    const res = db.prepare(`
      INSERT INTO twitch_streamers (guild_id, twitch_username, twitch_user_id, display_name, added_by, last_live_at)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(guildId, low, twitchUserId || null, displayName || username, addedBy);
    return res.lastInsertRowid;
  } catch (err) {
    console.error('[twitch-storage] addStreamer:', err);
    return null;
  }
}

function removeStreamer(guildId, username) {
  try {
    const res = db.prepare('DELETE FROM twitch_streamers WHERE guild_id = ? AND twitch_username = ? COLLATE NOCASE')
      .run(guildId, username);
    return res.changes > 0;
  } catch (err) {
    console.error('[twitch-storage] removeStreamer:', err);
    return false;
  }
}

function listStreamers(guildId) {
  try {
    return db.prepare('SELECT * FROM twitch_streamers WHERE guild_id = ? ORDER BY twitch_username ASC').all(guildId);
  } catch (err) {
    console.error('[twitch-storage] listStreamers:', err);
    return [];
  }
}

function listAllStreamers() {
  try {
    return db.prepare('SELECT * FROM twitch_streamers WHERE twitch_user_id IS NOT NULL').all();
  } catch (err) {
    console.error('[twitch-storage] listAllStreamers:', err);
    return [];
  }
}

function getStreamer(guildId, username) {
  try {
    return db.prepare('SELECT * FROM twitch_streamers WHERE guild_id = ? AND twitch_username = ? COLLATE NOCASE')
      .get(guildId, username) || null;
  } catch (err) {
    console.error('[twitch-storage] getStreamer:', err);
    return null;
  }
}

function updateLive(streamerId, liveAt, liveId) {
  try {
    db.prepare('UPDATE twitch_streamers SET last_live_at = ?, last_live_id = ? WHERE id = ?')
      .run(liveAt, liveId || null, streamerId);
  } catch (err) {
    console.error('[twitch-storage] updateLive:', err);
  }
}

module.exports = {
  getConfig,
  setConfig,
  addStreamer,
  removeStreamer,
  listStreamers,
  listAllStreamers,
  getStreamer,
  updateLive,
};
