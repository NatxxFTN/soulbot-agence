'use strict';

const { db } = require('../database');

const STMT_CREATE   = db.prepare('INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winners_count, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
const STMT_GET_ID   = db.prepare('SELECT * FROM giveaways WHERE id = ?');
const STMT_GET_MSG  = db.prepare('SELECT * FROM giveaways WHERE message_id = ?');
const STMT_ACTIVE   = db.prepare("SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?");
const STMT_END      = db.prepare('UPDATE giveaways SET ended = 1, winner_ids = ? WHERE id = ?');
const STMT_ADD_P    = db.prepare('INSERT OR IGNORE INTO giveaway_participants (giveaway_id, user_id) VALUES (?, ?)');
const STMT_DEL_P    = db.prepare('DELETE FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?');
const STMT_LIST_P   = db.prepare('SELECT user_id FROM giveaway_participants WHERE giveaway_id = ?');

function parseDuration(str) {
  const match = str?.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const u = match[2].toLowerCase();
  return n * { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[u];
}

function formatDuration(ms) {
  if (ms <= 0) return 'terminé';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const parts = [];
  if (d) parts.push(`${d}j`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!d && !h && s) parts.push(`${s}s`);
  return parts.join(' ') || '< 1s';
}

function createGiveaway(data) {
  const result = STMT_CREATE.run(
    data.guildId, data.channelId, data.messageId,
    data.prize, data.winnersCount ?? 1,
    data.endsAt, data.createdBy,
  );
  return result.lastInsertRowid;
}

function getGiveaway(id)          { return STMT_GET_ID.get(id); }
function getGiveawayByMessage(id) { return STMT_GET_MSG.get(id); }
function getActiveGiveaways()     { return STMT_ACTIVE.all(Date.now()); }

function addParticipant(giveawayId, userId)    { STMT_ADD_P.run(giveawayId, userId); }
function removeParticipant(giveawayId, userId) { STMT_DEL_P.run(giveawayId, userId); }
function getParticipants(giveawayId)           { return STMT_LIST_P.all(giveawayId).map(r => r.user_id); }

function drawWinners(giveawayId, count = 1) {
  const pool = getParticipants(giveawayId);
  if (!pool.length) return [];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
}

function markEnded(giveawayId, winnerIds) {
  STMT_END.run(JSON.stringify(winnerIds), giveawayId);
}

module.exports = {
  parseDuration, formatDuration,
  createGiveaway, getGiveaway, getGiveawayByMessage,
  getActiveGiveaways,
  addParticipant, removeParticipant, getParticipants,
  drawWinners, markEnded,
};
