'use strict';

const { db } = require('../database');

const STMT_GET    = db.prepare('SELECT * FROM lockdown_config WHERE guild_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO lockdown_config (guild_id, active, locked_by, locked_at, reason, locked_count)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    active       = excluded.active,
    locked_by    = excluded.locked_by,
    locked_at    = excluded.locked_at,
    reason       = excluded.reason,
    locked_count = excluded.locked_count
`);
const STMT_ADD_CHAN    = db.prepare('INSERT OR IGNORE INTO lockdown_channels (guild_id, channel_id) VALUES (?, ?)');
const STMT_DEL_CHAN    = db.prepare('DELETE FROM lockdown_channels WHERE guild_id = ? AND channel_id = ?');
const STMT_GET_CHANS  = db.prepare('SELECT channel_id FROM lockdown_channels WHERE guild_id = ?');
const STMT_CLEAR_CHAN  = db.prepare('DELETE FROM lockdown_channels WHERE guild_id = ?');

function getLockdownConfig(guildId) {
  return STMT_GET.get(guildId);
}

function setLockdownActive(guildId, { active, lockedBy, reason, lockedCount }) {
  STMT_UPSERT.run(guildId, active ? 1 : 0, lockedBy ?? null, active ? Math.floor(Date.now() / 1000) : null, reason ?? null, lockedCount ?? 0);
}

function addLockedChannel(guildId, channelId)    { STMT_ADD_CHAN.run(guildId, channelId); }
function removeLockedChannel(guildId, channelId) { STMT_DEL_CHAN.run(guildId, channelId); }
function getLockedChannels(guildId)              { return STMT_GET_CHANS.all(guildId).map(r => r.channel_id); }
function clearLockedChannels(guildId)            { STMT_CLEAR_CHAN.run(guildId); }

module.exports = { getLockdownConfig, setLockdownActive, addLockedChannel, removeLockedChannel, getLockedChannels, clearLockedChannels };
