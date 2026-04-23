'use strict';

// ── Custom Commands Storage — SQLite ─────────────────────────────────────────
// Table : custom_commands — scope par guild
// Limites validées : nom 2-32 chars [a-z0-9_-], 50 cmds/guild

const { db } = require('../database');

const NAME_REGEX   = /^[a-z0-9_-]{2,32}$/;
const MAX_PER_GUILD = 50;
const MAX_TEXT_LEN  = 2000;
const MAX_EMBED_LEN = 6000;

db.exec(`
  CREATE TABLE IF NOT EXISTS custom_commands (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id      TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    response_type TEXT    NOT NULL DEFAULT 'text',
    response_text TEXT,
    embed_data    TEXT,
    created_by    TEXT    NOT NULL,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER,
    uses_count    INTEGER NOT NULL DEFAULT 0,
    last_used_at  INTEGER
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_unique ON custom_commands(guild_id, name);
  CREATE INDEX IF NOT EXISTS idx_custom_guild        ON custom_commands(guild_id);
`);

// ── Prepared statements ──────────────────────────────────────────────────────

const STMT_INSERT = db.prepare(`
  INSERT INTO custom_commands (guild_id, name, response_type, response_text, embed_data, created_by, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const STMT_UPDATE = db.prepare(`
  UPDATE custom_commands
  SET response_type = ?, response_text = ?, embed_data = ?, updated_at = ?
  WHERE guild_id = ? AND name = ?
`);
const STMT_DELETE      = db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND name = ?');
const STMT_GET         = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?');
const STMT_GET_BY_ID   = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND id = ?');
const STMT_LIST        = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY uses_count DESC, created_at DESC LIMIT ? OFFSET ?');
const STMT_COUNT       = db.prepare('SELECT COUNT(*) AS n FROM custom_commands WHERE guild_id = ?');
const STMT_TOP         = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY uses_count DESC LIMIT ?');
const STMT_INC_USES    = db.prepare('UPDATE custom_commands SET uses_count = uses_count + 1, last_used_at = ? WHERE guild_id = ? AND name = ?');
const STMT_SUM_MONTH   = db.prepare(`
  SELECT COALESCE(SUM(uses_count), 0) AS total
  FROM custom_commands
  WHERE guild_id = ? AND (last_used_at >= ? OR updated_at >= ? OR created_at >= ?)
`);

// ── Validation ────────────────────────────────────────────────────────────────

function validateName(name) {
  return NAME_REGEX.test(name);
}

function validateData(responseType, data) {
  if (responseType === 'text') {
    if (typeof data?.text !== 'string') return { ok: false, reason: 'Texte manquant.' };
    if (data.text.length === 0)          return { ok: false, reason: 'Texte vide.' };
    if (data.text.length > MAX_TEXT_LEN) return { ok: false, reason: `Texte > ${MAX_TEXT_LEN} caractères.` };
    return { ok: true };
  }
  if (responseType === 'embed') {
    const json = JSON.stringify(data || {});
    if (json.length > MAX_EMBED_LEN)    return { ok: false, reason: `Embed > ${MAX_EMBED_LEN} caractères.` };
    return { ok: true };
  }
  return { ok: false, reason: 'response_type invalide (text|embed).' };
}

// ── API publique ─────────────────────────────────────────────────────────────

function createCommand(guildId, name, responseType, data, createdBy) {
  if (!validateName(name)) {
    throw new Error('Nom invalide. Utilise 2-32 caractères [a-z0-9_-] uniquement.');
  }
  const v = validateData(responseType, data);
  if (!v.ok) throw new Error(v.reason);

  if (countCommands(guildId) >= MAX_PER_GUILD) {
    throw new Error(`Limite de ${MAX_PER_GUILD} commandes atteinte.`);
  }
  if (STMT_GET.get(guildId, name)) {
    throw new Error(`La commande \`;${name}\` existe déjà.`);
  }

  const text  = responseType === 'text'  ? data.text : null;
  const embed = responseType === 'embed' ? JSON.stringify(data) : null;
  const now   = Date.now();

  const res = STMT_INSERT.run(guildId, name, responseType, text, embed, createdBy, now);
  return res.lastInsertRowid;
}

function updateCommand(guildId, name, responseType, data) {
  const v = validateData(responseType, data);
  if (!v.ok) throw new Error(v.reason);

  const text  = responseType === 'text'  ? data.text : null;
  const embed = responseType === 'embed' ? JSON.stringify(data) : null;

  const res = STMT_UPDATE.run(responseType, text, embed, Date.now(), guildId, name);
  return res.changes > 0;
}

function deleteCommand(guildId, name) {
  return STMT_DELETE.run(guildId, name).changes > 0;
}

function getCommand(guildId, name) {
  return STMT_GET.get(guildId, name) || null;
}

function getCommandById(guildId, id) {
  return STMT_GET_BY_ID.get(guildId, id) || null;
}

function listCommands(guildId, page = 0, perPage = 10) {
  const total      = countCommands(guildId);
  const pages      = Math.max(1, Math.ceil(total / perPage));
  const safePage   = Math.max(0, Math.min(page, pages - 1));
  const items      = STMT_LIST.all(guildId, perPage, safePage * perPage);
  return { items, total, pages, page: safePage };
}

function getTopCommands(guildId, limit = 10) {
  return STMT_TOP.all(guildId, limit);
}

function incrementUses(guildId, name) {
  try {
    STMT_INC_USES.run(Date.now(), guildId, name);
  } catch (err) {
    console.error('[custom-storage] incrementUses:', err.message);
  }
}

function countCommands(guildId) {
  return STMT_COUNT.get(guildId)?.n ?? 0;
}

function getTotalUsesThisMonth(guildId) {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return STMT_SUM_MONTH.get(guildId, monthStart, monthStart, monthStart)?.total ?? 0;
}

module.exports = {
  MAX_PER_GUILD,
  MAX_TEXT_LEN,
  NAME_REGEX,
  validateName,
  createCommand,
  updateCommand,
  deleteCommand,
  getCommand,
  getCommandById,
  listCommands,
  getTopCommands,
  incrementUses,
  countCommands,
  getTotalUsesThisMonth,
};
