'use strict';

const { db }     = require('../database');
const { LEVELS } = require('./permissions-levels');

// ── Table user_permissions ────────────────────────────────────────────────────
// Stocke le niveau hiérarchique custom d'un user sur un guild spécifique.
// N'existe PAS pour les Owners (détectés via .env) ni les users ordinaires
// (niveau USER par défaut si absent).
db.exec(`
  CREATE TABLE IF NOT EXISTS user_permissions (
    guild_id         TEXT    NOT NULL,
    user_id          TEXT    NOT NULL,
    permission_level INTEGER NOT NULL,
    granted_by       TEXT    NOT NULL,
    granted_at       INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_user_perms ON user_permissions (guild_id, user_id);
`);

const STMT_GET    = db.prepare('SELECT permission_level FROM user_permissions WHERE guild_id = ? AND user_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO user_permissions (guild_id, user_id, permission_level, granted_by, granted_at)
  VALUES (?, ?, ?, ?, unixepoch())
  ON CONFLICT(guild_id, user_id) DO UPDATE SET
    permission_level = excluded.permission_level,
    granted_by       = excluded.granted_by,
    granted_at       = unixepoch()
`);
const STMT_DELETE = db.prepare('DELETE FROM user_permissions WHERE guild_id = ? AND user_id = ?');
const STMT_LIST   = db.prepare('SELECT * FROM user_permissions WHERE guild_id = ? ORDER BY permission_level DESC');
const STMT_BL     = db.prepare('SELECT 1 FROM bot_blacklist WHERE user_id = ?');

function _ownerIds() {
  return (process.env.BOT_OWNERS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => /^\d{17,19}$/.test(s));
}

/**
 * Retourne le niveau d'un user.
 * Priorité : Owner .env > user_permissions DB > USER par défaut.
 * @param {string} userId
 * @param {string|null} guildId  null = DM, skip guild check
 */
function getUserLevel(userId, guildId) {
  if (_ownerIds().includes(userId)) return LEVELS.OWNER;
  if (!guildId) return LEVELS.USER;

  const row = STMT_GET.get(guildId, userId);
  return row ? row.permission_level : LEVELS.USER;
}

/**
 * Vérifie si un user est dans la blacklist globale du bot.
 */
function isGloballyBlacklisted(userId) {
  try { return !!STMT_BL.get(userId); } catch { return false; }
}

/**
 * Définit le niveau d'un user sur un guild.
 */
function setUserLevel(userId, guildId, level, grantedBy) {
  STMT_UPSERT.run(guildId, userId, level, grantedBy);
}

/**
 * Retire le niveau custom d'un user (retour USER par défaut).
 */
function removeUserLevel(userId, guildId) {
  STMT_DELETE.run(guildId, userId);
}

/**
 * Liste tous les users avec un niveau custom sur un guild.
 */
function listGuildLevels(guildId) {
  return STMT_LIST.all(guildId);
}

module.exports = {
  getUserLevel,
  isGloballyBlacklisted,
  setUserLevel,
  removeUserLevel,
  listGuildLevels,
};
