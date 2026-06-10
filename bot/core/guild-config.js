'use strict';

// ═══════════════════════════════════════════════
// GUILD BOT CONFIG — v2.1.2
// CRUD de la table guild_bot_config (identité visuelle
// de Soulbot par serveur : nickname, banner, couleur embed).
//
// L'avatar global du bot n'est PAS modifiable par serveur côté
// Discord — banner_url sert d'identité visuelle de substitution
// (thumbnail/image dans les embeds de CE serveur).
// ═══════════════════════════════════════════════

const { db } = require('../database');

const _get = db.prepare('SELECT * FROM guild_bot_config WHERE guild_id = ?');
const _upsertNickname = db.prepare(`
  INSERT INTO guild_bot_config (guild_id, nickname, updated_at, updated_by)
  VALUES (?, ?, unixepoch(), ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    nickname = excluded.nickname,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by
`);
const _upsertBanner = db.prepare(`
  INSERT INTO guild_bot_config (guild_id, banner_url, updated_at, updated_by)
  VALUES (?, ?, unixepoch(), ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    banner_url = excluded.banner_url,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by
`);
const _upsertColor = db.prepare(`
  INSERT INTO guild_bot_config (guild_id, embed_color, updated_at, updated_by)
  VALUES (?, ?, unixepoch(), ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    embed_color = excluded.embed_color,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by
`);
const _delete = db.prepare('DELETE FROM guild_bot_config WHERE guild_id = ?');

/**
 * Config bot du serveur, ou null si jamais configurée.
 * @param {string} guildId
 * @returns {?{guild_id: string, nickname: ?string, banner_url: ?string, embed_color: string, updated_at: number, updated_by: ?string}}
 */
function getGuildBotConfig(guildId) {
  return _get.get(guildId) ?? null;
}

/**
 * Mémorise le nickname appliqué sur ce serveur (null = reset).
 * @param {string} guildId
 * @param {?string} nickname
 * @param {string} userId - auteur de la modification
 */
function setGuildNickname(guildId, nickname, userId) {
  _upsertNickname.run(guildId, nickname, userId);
}

/**
 * Définit l'image d'identité visuelle du bot sur ce serveur (null = reset).
 * @param {string} guildId
 * @param {?string} url
 * @param {string} userId
 */
function setGuildBanner(guildId, url, userId) {
  _upsertBanner.run(guildId, url, userId);
}

/**
 * Couleur d'embed personnalisée du serveur (hex sans #, ex. 'B600A8').
 * @param {string} guildId
 * @param {string} hex
 * @param {string} userId
 */
function setGuildEmbedColor(guildId, hex, userId) {
  _upsertColor.run(guildId, hex.replace(/^#/, '').toUpperCase(), userId);
}

/**
 * Supprime toute la config bot de ce serveur.
 * @param {string} guildId
 * @returns {boolean} true si une ligne existait
 */
function resetGuildBotConfig(guildId) {
  return _delete.run(guildId).changes > 0;
}

/**
 * URL de banner du serveur, ou null — raccourci pour les embeds.
 * @param {string} guildId
 */
function getGuildBanner(guildId) {
  return getGuildBotConfig(guildId)?.banner_url ?? null;
}

module.exports = {
  getGuildBotConfig,
  setGuildNickname,
  setGuildBanner,
  setGuildEmbedColor,
  resetGuildBotConfig,
  getGuildBanner,
};
