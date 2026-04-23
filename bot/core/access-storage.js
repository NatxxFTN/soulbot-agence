'use strict';

// ── Permissions Storage — 3 niveaux (BotOwner · Buyer · Owner) ───────────────
// Source canonique : data/bot.db
// Tables : bot_buyers · bot_owners — scope par guild_id

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_buyers (
    guild_id  TEXT    NOT NULL,
    user_id   TEXT    NOT NULL,
    added_by  TEXT    NOT NULL,
    added_at  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS bot_owners (
    guild_id  TEXT    NOT NULL,
    user_id   TEXT    NOT NULL,
    added_by  TEXT    NOT NULL,
    added_at  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_buyers_guild ON bot_buyers(guild_id);
  CREATE INDEX IF NOT EXISTS idx_owners_guild ON bot_owners(guild_id);
`);

// ─── Prepared statements ─────────────────────────────────────────────────────

const STMT_GET_BUYER    = db.prepare('SELECT 1 FROM bot_buyers WHERE guild_id = ? AND user_id = ?');
const STMT_ADD_BUYER    = db.prepare('INSERT OR IGNORE INTO bot_buyers (guild_id, user_id, added_by, added_at) VALUES (?, ?, ?, ?)');
const STMT_DEL_BUYER    = db.prepare('DELETE FROM bot_buyers WHERE guild_id = ? AND user_id = ?');
const STMT_LIST_BUYERS  = db.prepare('SELECT user_id, added_by, added_at FROM bot_buyers WHERE guild_id = ? ORDER BY added_at DESC');
const STMT_COUNT_BUYERS = db.prepare('SELECT COUNT(*) AS n FROM bot_buyers WHERE guild_id = ?');

const STMT_GET_OWNER    = db.prepare('SELECT 1 FROM bot_owners WHERE guild_id = ? AND user_id = ?');
const STMT_ADD_OWNER    = db.prepare('INSERT OR IGNORE INTO bot_owners (guild_id, user_id, added_by, added_at) VALUES (?, ?, ?, ?)');
const STMT_DEL_OWNER    = db.prepare('DELETE FROM bot_owners WHERE guild_id = ? AND user_id = ?');
const STMT_LIST_OWNERS  = db.prepare('SELECT user_id, added_by, added_at FROM bot_owners WHERE guild_id = ? ORDER BY added_at DESC');
const STMT_COUNT_OWNERS = db.prepare('SELECT COUNT(*) AS n FROM bot_owners WHERE guild_id = ?');

// ─── API publique ─────────────────────────────────────────────────────────────

function addBuyer(guildId, userId, addedBy) {
  try {
    const res = STMT_ADD_BUYER.run(guildId, userId, addedBy, Date.now());
    return res.changes > 0;
  } catch (err) {
    console.error('[permissions-storage] addBuyer:', err);
    return false;
  }
}

function removeBuyer(guildId, userId) {
  try {
    const res = STMT_DEL_BUYER.run(guildId, userId);
    return res.changes > 0;
  } catch (err) {
    console.error('[permissions-storage] removeBuyer:', err);
    return false;
  }
}

function isBuyer(guildId, userId) {
  try {
    return !!STMT_GET_BUYER.get(guildId, userId);
  } catch (err) {
    console.error('[permissions-storage] isBuyer:', err);
    return false;
  }
}

function listBuyers(guildId) {
  try {
    return STMT_LIST_BUYERS.all(guildId);
  } catch (err) {
    console.error('[permissions-storage] listBuyers:', err);
    return [];
  }
}

function countBuyers(guildId) {
  try {
    return STMT_COUNT_BUYERS.get(guildId)?.n ?? 0;
  } catch (err) {
    console.error('[permissions-storage] countBuyers:', err);
    return 0;
  }
}

function addOwner(guildId, userId, addedBy) {
  try {
    const res = STMT_ADD_OWNER.run(guildId, userId, addedBy, Date.now());
    return res.changes > 0;
  } catch (err) {
    console.error('[permissions-storage] addOwner:', err);
    return false;
  }
}

function removeOwner(guildId, userId) {
  try {
    const res = STMT_DEL_OWNER.run(guildId, userId);
    return res.changes > 0;
  } catch (err) {
    console.error('[permissions-storage] removeOwner:', err);
    return false;
  }
}

function isOwner(guildId, userId) {
  try {
    return !!STMT_GET_OWNER.get(guildId, userId);
  } catch (err) {
    console.error('[permissions-storage] isOwner:', err);
    return false;
  }
}

function listOwners(guildId) {
  try {
    return STMT_LIST_OWNERS.all(guildId);
  } catch (err) {
    console.error('[permissions-storage] listOwners:', err);
    return [];
  }
}

function countOwners(guildId) {
  try {
    return STMT_COUNT_OWNERS.get(guildId)?.n ?? 0;
  } catch (err) {
    console.error('[permissions-storage] countOwners:', err);
    return 0;
  }
}

/**
 * Retire un user de bot_buyers ET bot_owners (ex. bannissement propre).
 * Retourne le nombre total de lignes supprimées.
 */
function wipeUser(guildId, userId) {
  try {
    const b = STMT_DEL_BUYER.run(guildId, userId).changes;
    const o = STMT_DEL_OWNER.run(guildId, userId).changes;
    return b + o;
  } catch (err) {
    console.error('[permissions-storage] wipeUser:', err);
    return 0;
  }
}

module.exports = {
  addBuyer, removeBuyer, isBuyer, listBuyers, countBuyers,
  addOwner, removeOwner, isOwner, listOwners, countOwners,
  wipeUser,
};
