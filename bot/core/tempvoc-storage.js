'use strict';

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS tempvoc_config (
    guild_id              TEXT PRIMARY KEY,
    hub_channel_id        TEXT,
    category_id           TEXT,
    default_name_template TEXT    NOT NULL DEFAULT '🎮 Salon de {user}',
    default_user_limit    INTEGER NOT NULL DEFAULT 0,
    delete_when_empty     INTEGER NOT NULL DEFAULT 1,
    transfer_on_leave     INTEGER NOT NULL DEFAULT 1,
    enabled               INTEGER NOT NULL DEFAULT 1,
    updated_at            INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS tempvoc_active (
    channel_id TEXT PRIMARY KEY,
    guild_id   TEXT    NOT NULL,
    owner_id   TEXT    NOT NULL,
    created_at INTEGER NOT NULL,
    locked     INTEGER NOT NULL DEFAULT 0,
    hidden     INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_tempvoc_active_guild ON tempvoc_active(guild_id);
`);

const STMT_GET_CONFIG    = db.prepare('SELECT * FROM tempvoc_config WHERE guild_id = ?');
const STMT_UPSERT_CONFIG = db.prepare(`
  INSERT INTO tempvoc_config (guild_id, hub_channel_id, category_id, default_name_template, default_user_limit, delete_when_empty, transfer_on_leave, enabled, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    hub_channel_id        = excluded.hub_channel_id,
    category_id           = excluded.category_id,
    default_name_template = excluded.default_name_template,
    default_user_limit    = excluded.default_user_limit,
    delete_when_empty     = excluded.delete_when_empty,
    transfer_on_leave     = excluded.transfer_on_leave,
    enabled               = excluded.enabled,
    updated_at            = excluded.updated_at
`);
const STMT_INSERT_ACTIVE  = db.prepare('INSERT OR REPLACE INTO tempvoc_active (channel_id, guild_id, owner_id, created_at, locked, hidden) VALUES (?, ?, ?, ?, 0, 0)');
const STMT_GET_ACTIVE     = db.prepare('SELECT * FROM tempvoc_active WHERE channel_id = ?');
const STMT_DEL_ACTIVE     = db.prepare('DELETE FROM tempvoc_active WHERE channel_id = ?');
const STMT_LIST_ACTIVE    = db.prepare('SELECT * FROM tempvoc_active WHERE guild_id = ? ORDER BY created_at DESC');
const STMT_UPD_OWNER      = db.prepare('UPDATE tempvoc_active SET owner_id = ? WHERE channel_id = ?');
const STMT_UPD_LOCKED     = db.prepare('UPDATE tempvoc_active SET locked = ? WHERE channel_id = ?');
const STMT_UPD_HIDDEN     = db.prepare('UPDATE tempvoc_active SET hidden = ? WHERE channel_id = ?');

function getConfig(guildId) { return STMT_GET_CONFIG.get(guildId) || null; }

function setConfig(guildId, partial = {}) {
  const cur = getConfig(guildId) || {};
  STMT_UPSERT_CONFIG.run(
    guildId,
    partial.hub_channel_id        ?? cur.hub_channel_id        ?? null,
    partial.category_id           ?? cur.category_id           ?? null,
    partial.default_name_template ?? cur.default_name_template ?? '🎮 Salon de {user}',
    partial.default_user_limit    ?? cur.default_user_limit    ?? 0,
    partial.delete_when_empty     ?? cur.delete_when_empty     ?? 1,
    partial.transfer_on_leave     ?? cur.transfer_on_leave     ?? 1,
    partial.enabled               ?? cur.enabled               ?? 1,
    Date.now(),
  );
}

function createTempVoc(channelId, guildId, ownerId) { STMT_INSERT_ACTIVE.run(channelId, guildId, ownerId, Date.now()); }
function deleteTempVoc(channelId) { STMT_DEL_ACTIVE.run(channelId); }
function getTempVoc(channelId) { return STMT_GET_ACTIVE.get(channelId) || null; }
function isOwner(channelId, userId) { const tv = getTempVoc(channelId); return !!tv && tv.owner_id === userId; }
function transferOwnership(channelId, newOwnerId) { STMT_UPD_OWNER.run(newOwnerId, channelId); }
function listActive(guildId) { return STMT_LIST_ACTIVE.all(guildId); }
function setLocked(channelId, locked) { STMT_UPD_LOCKED.run(locked ? 1 : 0, channelId); }
function setHidden(channelId, hidden) { STMT_UPD_HIDDEN.run(hidden ? 1 : 0, channelId); }

module.exports = {
  getConfig, setConfig,
  createTempVoc, deleteTempVoc, getTempVoc, isOwner,
  transferOwnership, listActive,
  setLocked, setHidden,
};
