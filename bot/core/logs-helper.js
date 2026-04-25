'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// LOGS HELPER — système de logs serveur (Vague 2)
// Lit la config depuis guild_log_config + guild_log_events,
// formate les embeds, envoie dans le channel configuré.
// Fournit un ring buffer mémoire pour ;logsview.
// ═══════════════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const { db } = require('../database');

// ─── Types d'events supportés (ordre = ordre d'affichage dans ;logs) ─────────

const EVENT_TYPES = [
  'message_delete',
  'message_edit',
  'member_join',
  'member_leave',
  'member_ban',
  'member_unban',
  'member_kick',
  'member_nickname_change',
  'role_create',
  'role_delete',
  'role_update',
  'channel_create',
  'channel_delete',
  'voice_join',
  'voice_leave',
  'voice_move',
];

// Couleurs par famille (cohérence DESIGN.md)
const EVENT_COLORS = {
  message_delete        : 0xE74C3C, // rouge (destructif)
  message_edit          : 0xF1C40F, // jaune (modif)
  member_join           : 0x27AE60, // vert
  member_leave          : 0x95A5A6, // gris
  member_ban            : 0xE74C3C,
  member_unban          : 0x27AE60,
  member_kick           : 0xE67E22, // orange (entre warn et ban)
  member_nickname_change: 0xF1C40F,
  role_create           : 0x27AE60,
  role_delete           : 0xE74C3C,
  role_update           : 0xF1C40F,
  channel_create        : 0x27AE60,
  channel_delete        : 0xE74C3C,
  voice_join            : 0x3498DB,
  voice_leave           : 0x95A5A6,
  voice_move            : 0x3498DB,
};

const EVENT_LABELS = {
  message_delete        : '🗑️  Message supprimé',
  message_edit          : '✏️  Message modifié',
  member_join           : '📥  Membre rejoint',
  member_leave          : '📤  Membre parti',
  member_ban            : '🔨  Membre banni',
  member_unban          : '🔓  Membre débanni',
  member_kick           : '👢  Membre expulsé',
  member_nickname_change: '🏷️  Pseudo modifié',
  role_create           : '➕  Rôle créé',
  role_delete           : '➖  Rôle supprimé',
  role_update           : '🔧  Rôle modifié',
  channel_create        : '📂  Salon créé',
  channel_delete        : '🗂️  Salon supprimé',
  voice_join            : '🎤  Entrée vocal',
  voice_leave           : '🔇  Sortie vocal',
  voice_move            : '↔️  Déplacement vocal',
};

// ─── Ring buffer en mémoire pour ;logsview ────────────────────────────────────

const VIEW_BUFFER_SIZE = 20;
const _viewBuffer = new Map(); // guildId → Array<{ts, type, summary}>

function _pushToBuffer(guildId, type, summary) {
  const arr = _viewBuffer.get(guildId) || [];
  arr.unshift({ ts: Date.now(), type, summary });
  if (arr.length > VIEW_BUFFER_SIZE) arr.length = VIEW_BUFFER_SIZE;
  _viewBuffer.set(guildId, arr);
}

// ─── Prepared statements ──────────────────────────────────────────────────────

const STMT_GET_CONFIG = db.prepare('SELECT * FROM guild_log_config WHERE guild_id = ?');
const STMT_UPSERT_CONFIG = db.prepare(`
  INSERT INTO guild_log_config (guild_id, channel_id, updated_at, updated_by)
  VALUES (?, ?, unixepoch(), ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    channel_id = excluded.channel_id,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by
`);
const STMT_DELETE_CONFIG = db.prepare('DELETE FROM guild_log_config WHERE guild_id = ?');

const STMT_GET_EVENTS = db.prepare('SELECT event_type, enabled FROM guild_log_events WHERE guild_id = ?');
const STMT_GET_EVENT = db.prepare('SELECT enabled FROM guild_log_events WHERE guild_id = ? AND event_type = ?');
const STMT_UPSERT_EVENT = db.prepare(`
  INSERT INTO guild_log_events (guild_id, event_type, enabled)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id, event_type) DO UPDATE SET enabled = excluded.enabled
`);
const STMT_DELETE_EVENTS = db.prepare('DELETE FROM guild_log_events WHERE guild_id = ?');

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * @param {string} guildId
 * @returns {{channel_id: string|null, events: Record<string, boolean>} | null}
 */
function getConfig(guildId) {
  const cfg = STMT_GET_CONFIG.get(guildId);
  if (!cfg) return null;
  const rows = STMT_GET_EVENTS.all(guildId);
  const events = {};
  for (const t of EVENT_TYPES) events[t] = true; // défaut ON
  for (const r of rows) events[r.event_type] = !!r.enabled;
  return { channel_id: cfg.channel_id, events };
}

function isEventEnabled(guildId, eventType) {
  const cfg = STMT_GET_CONFIG.get(guildId);
  if (!cfg || !cfg.channel_id) return false;
  const row = STMT_GET_EVENT.get(guildId, eventType);
  if (!row) return true; // pas de ligne → défaut ON
  return !!row.enabled;
}

/** Set/overwrite le channel de logs et initialise tous les events à enabled=1 si première config. */
function setChannel(guildId, channelId, userId) {
  const existing = STMT_GET_CONFIG.get(guildId);
  STMT_UPSERT_CONFIG.run(guildId, channelId, userId || null);
  if (!existing) {
    // Premier setup : insérer tous les events par défaut = enabled
    const tx = db.transaction(() => {
      for (const t of EVENT_TYPES) STMT_UPSERT_EVENT.run(guildId, t, 1);
    });
    tx();
  }
  return getConfig(guildId);
}

function toggleEvent(guildId, eventType) {
  if (!EVENT_TYPES.includes(eventType)) return null;
  const row = STMT_GET_EVENT.get(guildId, eventType);
  const current = row ? !!row.enabled : true;
  const next = current ? 0 : 1;
  STMT_UPSERT_EVENT.run(guildId, eventType, next);
  return !!next;
}

function toggleAll(guildId, enable) {
  const val = enable ? 1 : 0;
  const tx = db.transaction(() => {
    for (const t of EVENT_TYPES) STMT_UPSERT_EVENT.run(guildId, t, val);
  });
  tx();
  return !!val;
}

function resetConfig(guildId) {
  const tx = db.transaction(() => {
    STMT_DELETE_CONFIG.run(guildId);
    STMT_DELETE_EVENTS.run(guildId);
  });
  tx();
  _viewBuffer.delete(guildId);
}

/**
 * Envoie un log dans le channel configuré (si event enabled).
 * @param {import('discord.js').Guild} guild
 * @param {string} eventType
 * @param {{title?: string, description?: string, fields?: Array, footer?: string, summary?: string}} payload
 */
async function log(guild, eventType, payload = {}) {
  if (!guild || !EVENT_TYPES.includes(eventType)) return;
  const guildId = guild.id;

  if (!isEventEnabled(guildId, eventType)) return;

  const cfg = STMT_GET_CONFIG.get(guildId);
  if (!cfg?.channel_id) return;

  const channel = guild.channels.cache.get(cfg.channel_id);
  if (!channel || !channel.isTextBased?.()) return;

  const me = guild.members.me;
  if (!me || !channel.permissionsFor(me)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) return;

  const label = EVENT_LABELS[eventType] || eventType;
  const embed = new EmbedBuilder()
    .setColor(EVENT_COLORS[eventType] ?? 0xFF0000)
    .setTitle(payload.title ?? label)
    .setTimestamp();

  if (payload.description) embed.setDescription(payload.description.slice(0, 4000));
  if (payload.fields?.length) embed.addFields(payload.fields.slice(0, 25));
  embed.setFooter({ text: payload.footer ?? `Soulbot Logs • ${eventType}` });

  try {
    await channel.send({ embeds: [embed] });
    _pushToBuffer(guildId, eventType, payload.summary ?? (payload.title ?? label));
  } catch { /* channel supprimé ou perm retirée entre-temps */ }
}

function getViewBuffer(guildId) {
  return _viewBuffer.get(guildId) || [];
}

module.exports = {
  EVENT_TYPES,
  EVENT_LABELS,
  EVENT_COLORS,
  getConfig,
  isEventEnabled,
  setChannel,
  toggleEvent,
  toggleAll,
  resetConfig,
  log,
  getViewBuffer,
};
