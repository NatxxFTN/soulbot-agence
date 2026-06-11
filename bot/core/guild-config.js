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

/* ═══════════════════════════════════════════════
   STUDIO V5 — identité étendue, audit trail, historique
   d'assets, presets. Tout write du Studio passe par
   applyIdentityDraft (transaction + log + history).
   ═══════════════════════════════════════════════ */

// Colonnes de guild_bot_config éditables par le Studio — allowlist stricte,
// jamais de nom de colonne issu d'un customId/modal sans passer par ici.
const IDENTITY_FIELDS = [
  'nickname', 'banner_url', 'embed_color', 'accent_color', 'theme_name',
  'avatar_url', 'footer_text', 'footer_icon_url', 'embed_style', 'brand_emoji_id',
  // V6 — couleurs + emojis sémantiques par serveur
  'color_success', 'color_error', 'color_warning', 'color_info',
  'emoji_success_id', 'emoji_error_id', 'emoji_warning_id', 'emoji_info_id',
];

// Assets historisés (galerie "↺ restaurer ancien") + leur type en DB.
const ASSET_FIELD_TYPES = { avatar_url: 'avatar', banner_url: 'banner', embed_color: 'color' };

const HISTORY_MAX = 20;
const PRESETS_MAX = 10;

const _logChange = db.prepare(`
  INSERT INTO bot_config_log (guild_id, user_id, field, old_value, new_value)
  VALUES (?, ?, ?, ?, ?)
`);
const _getLog = db.prepare(`
  SELECT * FROM bot_config_log WHERE guild_id = ? ORDER BY ts DESC, id DESC LIMIT ?
`);
const _pushAsset = db.prepare(`
  INSERT INTO bot_assets_history (guild_id, asset_type, value) VALUES (?, ?, ?)
`);
const _trimAssets = db.prepare(`
  DELETE FROM bot_assets_history
  WHERE guild_id = ? AND asset_type = ? AND id NOT IN (
    SELECT id FROM bot_assets_history
    WHERE guild_id = ? AND asset_type = ?
    ORDER BY applied_at DESC, id DESC LIMIT ${HISTORY_MAX}
  )
`);
const _getAssets = db.prepare(`
  SELECT * FROM bot_assets_history
  WHERE guild_id = ? AND asset_type = ?
  ORDER BY applied_at DESC, id DESC LIMIT ?
`);

/**
 * Journalise un changement de config (audit trail → onglet Historique).
 * @param {string} guildId
 * @param {string} userId
 * @param {string} field
 * @param {?string} oldValue
 * @param {?string} newValue
 */
function logConfigChange(guildId, userId, field, oldValue, newValue) {
  _logChange.run(guildId, userId, field, oldValue ?? null, newValue ?? null);
}

/**
 * Timeline des changements du serveur (récent → ancien).
 * @param {string} guildId
 * @param {number} [limit]
 */
function getConfigLog(guildId, limit = 15) {
  return _getLog.all(guildId, limit);
}

/**
 * Pousse un asset dans l'historique + rotation FIFO (max 20 par type).
 * @param {string} guildId
 * @param {'avatar'|'banner'|'color'} assetType
 * @param {string} value
 */
function pushAssetHistory(guildId, assetType, value) {
  _pushAsset.run(guildId, assetType, value);
  _trimAssets.run(guildId, assetType, guildId, assetType);
}

/**
 * Galerie des anciens assets d'un type (rechargeables en 1 clic).
 * @param {string} guildId
 * @param {'avatar'|'banner'|'color'} assetType
 * @param {number} [limit]
 */
function getAssetHistory(guildId, assetType, limit = HISTORY_MAX) {
  return _getAssets.all(guildId, assetType, limit);
}

/**
 * Application ATOMIQUE d'un draft du Studio : upsert des champs modifiés,
 * journal bot_config_log par champ, push bot_assets_history pour les assets.
 * Aucune écriture partielle possible (transaction better-sqlite3).
 *
 * @param {string} guildId
 * @param {Object} draft - sous-ensemble de IDENTITY_FIELDS (valeurs DÉJÀ validées)
 * @param {string} userId
 * @returns {string[]} liste des champs réellement modifiés
 */
const applyIdentityDraft = db.transaction((guildId, draft, userId) => {
  const before  = getGuildBotConfig(guildId) ?? {};
  const changed = [];

  for (const field of IDENTITY_FIELDS) {
    if (!(field in draft)) continue;
    const newValue = draft[field] ?? null;
    const oldValue = before[field] ?? null;
    if (newValue === oldValue) continue;

    // Upsert colonne par colonne — le nom vient de l'allowlist, jamais de l'input.
    db.prepare(`
      INSERT INTO guild_bot_config (guild_id, ${field}, updated_at, updated_by)
      VALUES (?, ?, unixepoch(), ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        ${field} = excluded.${field},
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `).run(guildId, newValue, userId);

    logConfigChange(guildId, userId, field, oldValue, newValue);
    if (ASSET_FIELD_TYPES[field] && oldValue) {
      pushAssetHistory(guildId, ASSET_FIELD_TYPES[field], oldValue);
    }
    changed.push(field);
  }
  return changed;
});

// ─── Presets — snapshots complets save/load/dupliquer/renommer/supprimer ─────

const _listPresets  = db.prepare('SELECT id, guild_id, name, is_active, created_at FROM bot_presets WHERE guild_id = ? ORDER BY created_at DESC');
const _countPresets = db.prepare('SELECT COUNT(*) AS n FROM bot_presets WHERE guild_id = ?');
const _getPreset    = db.prepare('SELECT * FROM bot_presets WHERE id = ? AND guild_id = ?');
const _insertPreset = db.prepare('INSERT INTO bot_presets (guild_id, name, payload) VALUES (?, ?, ?)');
const _renamePreset = db.prepare('UPDATE bot_presets SET name = ? WHERE id = ? AND guild_id = ?');
const _deletePreset = db.prepare('DELETE FROM bot_presets WHERE id = ? AND guild_id = ?');
const _clearActive  = db.prepare('UPDATE bot_presets SET is_active = 0 WHERE guild_id = ?');
const _setActive    = db.prepare('UPDATE bot_presets SET is_active = 1 WHERE id = ? AND guild_id = ?');

/** Presets du serveur (récent → ancien). */
function listPresets(guildId) {
  return _listPresets.all(guildId);
}

/** Un preset (payload JSON parsé), ou null. */
function getPreset(guildId, presetId) {
  const row = _getPreset.get(presetId, guildId);
  if (!row) return null;
  try { return { ...row, payload: JSON.parse(row.payload) }; }
  catch { return { ...row, payload: null }; }
}

/**
 * Snapshot de l'état actuel → nouveau preset.
 * @param {string} guildId
 * @param {string} name - unique par serveur
 * @param {Object} payload - { identity, prefix, pricing } sérialisable
 * @returns {{ ok: boolean, reason?: 'limit'|'duplicate', id?: number }}
 */
function savePreset(guildId, name, payload) {
  if (_countPresets.get(guildId).n >= PRESETS_MAX) return { ok: false, reason: 'limit' };
  try {
    const info = _insertPreset.run(guildId, name, JSON.stringify(payload));
    return { ok: true, id: info.lastInsertRowid };
  } catch {
    return { ok: false, reason: 'duplicate' };
  }
}

/** Duplique un preset (suffixe " (copie)", tronqué à 50). */
function duplicatePreset(guildId, presetId) {
  const src = getPreset(guildId, presetId);
  if (!src) return { ok: false, reason: 'notfound' };
  const name = `${src.name} (copie)`.slice(0, 50);
  return savePreset(guildId, name, src.payload);
}

/** Renomme un preset. false si nom déjà pris ou preset inconnu. */
function renamePreset(guildId, presetId, newName) {
  try { return _renamePreset.run(newName, presetId, guildId).changes > 0; }
  catch { return false; }
}

/** Supprime un preset. */
function deletePreset(guildId, presetId) {
  return _deletePreset.run(presetId, guildId).changes > 0;
}

/** Marque un preset comme actif (un seul à la fois). */
function setActivePreset(guildId, presetId) {
  _clearActive.run(guildId);
  return _setActive.run(presetId, guildId).changes > 0;
}

module.exports = {
  getGuildBotConfig,
  setGuildNickname,
  setGuildBanner,
  setGuildEmbedColor,
  resetGuildBotConfig,
  getGuildBanner,
  // Studio V5
  IDENTITY_FIELDS,
  applyIdentityDraft,
  logConfigChange,
  getConfigLog,
  pushAssetHistory,
  getAssetHistory,
  listPresets,
  getPreset,
  savePreset,
  duplicatePreset,
  renamePreset,
  deletePreset,
  setActivePreset,
};
