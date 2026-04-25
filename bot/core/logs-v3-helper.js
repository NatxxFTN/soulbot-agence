'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// LOGS V3 HELPER — Système de logs Ultimate Soulbot
//
// Architecture :
//   • Caches mémoire : config / routing / formats / filters / events toggles
//   • Ring buffer : 50 derniers events par guilde en mémoire
//   • Fire-and-forget : channel.send() jamais await → latence Discord nulle
//   • Persistance async : setImmediate() pour history + stats
//   • EventEmitter : logEmitter pour dashboard temps réel
//
// Rétrocompat V2 : les listeners qui appellent logs-helper.js (V2) continuent
// de fonctionner. V3 ajoute une couche routing/formats/filters au-dessus
// des tables V2 existantes (guild_log_config + guild_log_events).
// ═══════════════════════════════════════════════════════════════════════════

const { EventEmitter } = require('events');
const { EmbedBuilder } = require('discord.js');
const { db } = require('../database');

// ─── 27 EVENT TYPES (V3 étendu) ───────────────────────────────────────────────

const EVENT_TYPES = {
  // Messages
  message_delete       : { group: 'messages',   icon: '💬', color: 0xFF6B6B, label: 'Message supprimé' },
  message_edit         : { group: 'messages',   icon: '✏️', color: 0x4ECDC4, label: 'Message modifié' },
  message_bulk_delete  : { group: 'messages',   icon: '🗑️', color: 0xFF6B6B, label: 'Purge messages' },

  // Members
  member_join          : { group: 'members',    icon: '📥', color: 0x95E1D3, label: 'Membre rejoint' },
  member_leave         : { group: 'members',    icon: '📤', color: 0xF38181, label: 'Membre parti' },
  member_ban           : { group: 'members',    icon: '🔨', color: 0xFF0000, label: 'Membre banni' },
  member_unban         : { group: 'members',    icon: '🔓', color: 0x95E1D3, label: 'Membre débanni' },
  member_kick          : { group: 'members',    icon: '👢', color: 0xF38181, label: 'Membre expulsé' },
  member_nickname_change: { group: 'members',   icon: '🏷️', color: 0xFCE38A, label: 'Pseudo modifié' },

  // Roles
  role_create          : { group: 'roles',      icon: '➕', color: 0x95E1D3, label: 'Rôle créé' },
  role_delete          : { group: 'roles',      icon: '➖', color: 0xFF6B6B, label: 'Rôle supprimé' },
  role_update          : { group: 'roles',      icon: '🔧', color: 0x4ECDC4, label: 'Rôle modifié' },
  role_permission_change: { group: 'roles',     icon: '🔐', color: 0xFCE38A, label: 'Permissions rôle modifiées' },

  // Channels
  channel_create       : { group: 'channels',   icon: '📂', color: 0x95E1D3, label: 'Salon créé' },
  channel_delete       : { group: 'channels',   icon: '🗂️', color: 0xFF6B6B, label: 'Salon supprimé' },
  channel_update       : { group: 'channels',   icon: '🔧', color: 0x4ECDC4, label: 'Salon modifié' },

  // Voice
  voice_join           : { group: 'voice',      icon: '🎤', color: 0x95E1D3, label: 'Rejoint vocal' },
  voice_leave          : { group: 'voice',      icon: '🔇', color: 0xF38181, label: 'Quitte vocal' },
  voice_move           : { group: 'voice',      icon: '↔️', color: 0xFCE38A, label: 'Déplacement vocal' },

  // Server
  server_update        : { group: 'server',     icon: '⚙️', color: 0x4ECDC4, label: 'Serveur modifié' },
  emoji_update         : { group: 'server',     icon: '😀', color: 0xFCE38A, label: 'Emojis modifiés' },
  boost_add            : { group: 'server',     icon: '🚀', color: 0xF38BFF, label: 'Boost ajouté' },
  invite_create        : { group: 'server',     icon: '🔗', color: 0x95E1D3, label: 'Invitation créée' },

  // Modération Soulbot
  mod_warn             : { group: 'moderation', icon: '⚠️', color: 0xFCE38A, label: 'Avertissement' },
  mod_mute             : { group: 'moderation', icon: '🔕', color: 0xF38181, label: 'Mute appliqué' },
  mod_unmute           : { group: 'moderation', icon: '🔔', color: 0x95E1D3, label: 'Mute retiré' },
  mod_timeout          : { group: 'moderation', icon: '⏲️', color: 0xF38181, label: 'Timeout appliqué' },
};

const EVENT_GROUPS = ['messages', 'members', 'roles', 'channels', 'voice', 'server', 'moderation'];

// ─── Caches mémoire (remplis par bootstrapCache) ──────────────────────────────

// guildId → { global_enabled, default_channel_id, theme, category_id, version }
const configCache = new Map();

// "guildId:event_type" → channel_id
const routingCache = new Map();

// "guildId:event_type" → { template, color_hex, icon_emoji, enabled }
const formatsCache = new Map();

// "guildId:event_type" → [{ id, filter_type, filter_value }, ...]
const filtersCache = new Map();

// "guildId:event_type" → boolean (toggles V2)
const togglesCache = new Map();

// guildId → [{ ts, type, summary, actorId, targetId }, ...]
const ringBuffer = new Map();
const RING_BUFFER_SIZE = 50;

// Event emitter pour dashboard temps réel
const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(50);

// ─── Prepared statements ──────────────────────────────────────────────────────

const STMT_CONFIG_GET     = db.prepare('SELECT * FROM guild_log_config WHERE guild_id = ?');
const STMT_CONFIG_UPSERT  = db.prepare(`
  INSERT INTO guild_log_config (guild_id, default_channel_id, theme, global_enabled, category_id, version, updated_at, updated_by)
  VALUES (?, ?, COALESCE(?, 'premium'), COALESCE(?, 1), ?, 'v3', unixepoch(), ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    default_channel_id = COALESCE(excluded.default_channel_id, guild_log_config.default_channel_id),
    theme              = COALESCE(excluded.theme, guild_log_config.theme),
    global_enabled     = COALESCE(excluded.global_enabled, guild_log_config.global_enabled),
    category_id        = COALESCE(excluded.category_id, guild_log_config.category_id),
    version            = 'v3',
    updated_at         = unixepoch(),
    updated_by         = excluded.updated_by
`);

const STMT_ROUTING_GET    = db.prepare('SELECT event_type, channel_id FROM guild_log_routing WHERE guild_id = ?');
const STMT_ROUTING_UPSERT = db.prepare(`
  INSERT INTO guild_log_routing (guild_id, event_type, channel_id)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id, event_type) DO UPDATE SET channel_id = excluded.channel_id
`);
const STMT_ROUTING_DELETE = db.prepare('DELETE FROM guild_log_routing WHERE guild_id = ? AND event_type = ?');

const STMT_FORMATS_GET    = db.prepare('SELECT event_type, template, color_hex, icon_emoji, enabled FROM guild_log_formats WHERE guild_id = ?');
const STMT_FORMATS_UPSERT = db.prepare(`
  INSERT INTO guild_log_formats (guild_id, event_type, template, color_hex, icon_emoji, enabled)
  VALUES (?, ?, ?, ?, ?, 1)
  ON CONFLICT(guild_id, event_type) DO UPDATE SET
    template   = excluded.template,
    color_hex  = excluded.color_hex,
    icon_emoji = excluded.icon_emoji
`);

const STMT_FILTERS_GET    = db.prepare('SELECT * FROM guild_log_filters WHERE guild_id = ?');
const STMT_FILTERS_INSERT = db.prepare(`
  INSERT INTO guild_log_filters (guild_id, event_type, filter_type, filter_value)
  VALUES (?, ?, ?, ?)
`);
const STMT_FILTERS_DELETE = db.prepare('DELETE FROM guild_log_filters WHERE id = ? AND guild_id = ?');

const STMT_TOGGLES_GET    = db.prepare('SELECT event_type, enabled FROM guild_log_events WHERE guild_id = ?');
const STMT_TOGGLES_UPSERT = db.prepare(`
  INSERT INTO guild_log_events (guild_id, event_type, enabled)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id, event_type) DO UPDATE SET enabled = excluded.enabled
`);

const STMT_HISTORY_INSERT = db.prepare(`
  INSERT INTO guild_log_history (guild_id, event_type, actor_id, target_id, channel_id, data_json)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const STMT_HISTORY_SEARCH = db.prepare(`
  SELECT * FROM guild_log_history
  WHERE guild_id = ? AND (event_type LIKE ? OR data_json LIKE ?)
  ORDER BY created_at DESC LIMIT ?
`);

const STMT_STATS_UPSERT   = db.prepare(`
  INSERT INTO guild_log_stats_daily (guild_id, date, event_type, count)
  VALUES (?, ?, ?, 1)
  ON CONFLICT(guild_id, date, event_type) DO UPDATE SET count = count + 1
`);
const STMT_STATS_TODAY    = db.prepare(`
  SELECT event_type, count FROM guild_log_stats_daily
  WHERE guild_id = ? AND date = ?
  ORDER BY count DESC
`);

// ─── Helpers internes ─────────────────────────────────────────────────────────

function _key(guildId, eventType) { return `${guildId}:${eventType}`; }
function _today() { return new Date().toISOString().slice(0, 10); }

/** Remplit les caches depuis la DB. Idempotent. */
function bootstrapCache() {
  configCache.clear();
  routingCache.clear();
  formatsCache.clear();
  filtersCache.clear();
  togglesCache.clear();

  // Configs
  const configs = db.prepare('SELECT * FROM guild_log_config').all();
  for (const c of configs) {
    configCache.set(c.guild_id, {
      global_enabled     : c.global_enabled !== 0,
      default_channel_id : c.default_channel_id || c.channel_id || null,
      theme              : c.theme || 'premium',
      category_id        : c.category_id || null,
      version            : c.version || 'v2',
    });
  }

  // Routings
  const routings = db.prepare('SELECT guild_id, event_type, channel_id FROM guild_log_routing').all();
  for (const r of routings) {
    routingCache.set(_key(r.guild_id, r.event_type), r.channel_id);
  }

  // Formats
  const formats = db.prepare('SELECT * FROM guild_log_formats').all();
  for (const f of formats) {
    formatsCache.set(_key(f.guild_id, f.event_type), {
      template  : f.template,
      color_hex : f.color_hex,
      icon_emoji: f.icon_emoji,
      enabled   : f.enabled !== 0,
    });
  }

  // Filters
  const filters = db.prepare('SELECT * FROM guild_log_filters').all();
  for (const f of filters) {
    const k = _key(f.guild_id, f.event_type);
    if (!filtersCache.has(k)) filtersCache.set(k, []);
    filtersCache.get(k).push({ id: f.id, type: f.filter_type, value: f.filter_value });
  }

  // Toggles V2 (guild_log_events)
  const toggles = db.prepare('SELECT guild_id, event_type, enabled FROM guild_log_events').all();
  for (const t of toggles) {
    togglesCache.set(_key(t.guild_id, t.event_type), t.enabled !== 0);
  }

  console.log(`[logs-v3] bootstrapCache: ${configs.length} configs · ${routings.length} routings · ${formats.length} formats · ${filters.length} filters · ${toggles.length} toggles`);
}

// ─── Config ──────────────────────────────────────────────────────────────────

function getConfig(guildId) {
  if (!configCache.has(guildId)) {
    const row = STMT_CONFIG_GET.get(guildId);
    if (!row) return { global_enabled: true, default_channel_id: null, theme: 'premium', category_id: null, version: 'v3' };
    configCache.set(guildId, {
      global_enabled     : row.global_enabled !== 0,
      default_channel_id : row.default_channel_id || row.channel_id || null,
      theme              : row.theme || 'premium',
      category_id        : row.category_id || null,
      version            : row.version || 'v2',
    });
  }
  return configCache.get(guildId);
}

function setDefaultChannel(guildId, channelId, userId) {
  STMT_CONFIG_UPSERT.run(guildId, channelId, null, null, null, userId || null);
  const cur = getConfig(guildId);
  cur.default_channel_id = channelId;
  configCache.set(guildId, cur);
}

function setGlobalEnabled(guildId, enabled, userId) {
  STMT_CONFIG_UPSERT.run(guildId, null, null, enabled ? 1 : 0, null, userId || null);
  const cur = getConfig(guildId);
  cur.global_enabled = !!enabled;
  configCache.set(guildId, cur);
}

function setTheme(guildId, theme, userId) {
  STMT_CONFIG_UPSERT.run(guildId, null, theme, null, null, userId || null);
  const cur = getConfig(guildId);
  cur.theme = theme;
  configCache.set(guildId, cur);
}

function setCategoryId(guildId, categoryId, userId) {
  STMT_CONFIG_UPSERT.run(guildId, null, null, null, categoryId, userId || null);
  const cur = getConfig(guildId);
  cur.category_id = categoryId;
  configCache.set(guildId, cur);
}

// ─── Routing ─────────────────────────────────────────────────────────────────

function setEventChannel(guildId, eventType, channelId) {
  STMT_ROUTING_UPSERT.run(guildId, eventType, channelId);
  routingCache.set(_key(guildId, eventType), channelId);
}

function setGroupChannel(guildId, group, channelId) {
  const events = Object.entries(EVENT_TYPES).filter(([, v]) => v.group === group);
  const tx = db.transaction(() => {
    for (const [t] of events) {
      STMT_ROUTING_UPSERT.run(guildId, t, channelId);
      routingCache.set(_key(guildId, t), channelId);
    }
  });
  tx();
  return events.length;
}

function getEventChannel(guildId, eventType) {
  return routingCache.get(_key(guildId, eventType))
    || getConfig(guildId).default_channel_id
    || null;
}

function clearEventChannel(guildId, eventType) {
  STMT_ROUTING_DELETE.run(guildId, eventType);
  routingCache.delete(_key(guildId, eventType));
}

// ─── Events toggle ────────────────────────────────────────────────────────────

function isEventEnabled(guildId, eventType) {
  const cfg = getConfig(guildId);
  if (!cfg.global_enabled) return false;
  const k = _key(guildId, eventType);
  if (togglesCache.has(k)) return togglesCache.get(k);
  // Pas de row en DB → default ON
  return true;
}

function toggleEvent(guildId, eventType, enabled) {
  const val = enabled ? 1 : 0;
  STMT_TOGGLES_UPSERT.run(guildId, eventType, val);
  togglesCache.set(_key(guildId, eventType), !!val);
  return !!val;
}

function toggleGroup(guildId, group, enabled) {
  const val = enabled ? 1 : 0;
  const events = Object.entries(EVENT_TYPES).filter(([, v]) => v.group === group).map(([k]) => k);
  const tx = db.transaction(() => {
    for (const t of events) {
      STMT_TOGGLES_UPSERT.run(guildId, t, val);
      togglesCache.set(_key(guildId, t), !!val);
    }
  });
  tx();
  return events.length;
}

function toggleAll(guildId, enabled) {
  const val = enabled ? 1 : 0;
  const events = Object.keys(EVENT_TYPES);
  const tx = db.transaction(() => {
    for (const t of events) {
      STMT_TOGGLES_UPSERT.run(guildId, t, val);
      togglesCache.set(_key(guildId, t), !!val);
    }
  });
  tx();
  return events.length;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

function addFilter(guildId, eventType, filterType, filterValue) {
  const res = STMT_FILTERS_INSERT.run(guildId, eventType, filterType, filterValue);
  const k = _key(guildId, eventType);
  if (!filtersCache.has(k)) filtersCache.set(k, []);
  filtersCache.get(k).push({ id: res.lastInsertRowid, type: filterType, value: filterValue });
  return res.lastInsertRowid;
}

function removeFilter(guildId, filterId) {
  STMT_FILTERS_DELETE.run(filterId, guildId);
  for (const [k, arr] of filtersCache.entries()) {
    if (!k.startsWith(guildId + ':')) continue;
    const idx = arr.findIndex(f => f.id === filterId);
    if (idx >= 0) arr.splice(idx, 1);
  }
}

function checkFilters(guildId, eventType, context = {}) {
  const filters = filtersCache.get(_key(guildId, eventType));
  if (!filters?.length) return true;

  for (const f of filters) {
    if (f.type === 'ignore_bot' && context.isBot) return false;
    if (f.type === 'ignore_user' && context.actorId === f.value) return false;
    if (f.type === 'ignore_channel' && context.channelId === f.value) return false;
    if (f.type === 'ignore_role' && Array.isArray(context.actorRoles) && context.actorRoles.includes(f.value)) return false;
  }
  return true;
}

// ─── Format resolver ─────────────────────────────────────────────────────────

function getFormat(guildId, eventType) {
  const custom = formatsCache.get(_key(guildId, eventType));
  const base = EVENT_TYPES[eventType];
  if (!base) return null;

  return {
    color : custom?.color_hex ? parseInt(custom.color_hex.replace('#', ''), 16) : base.color,
    icon  : custom?.icon_emoji || base.icon,
    label : base.label,
    template: custom?.template || null,
  };
}

// ─── Core : log() — fire-and-forget ──────────────────────────────────────────

/**
 * Émet un log V3. Non bloquant, fire-and-forget.
 * @param {import('discord.js').Guild} guild
 * @param {string} eventType
 * @param {Object} data — { title?, description?, fields?, actorId?, targetId?, channelId?, isBot?, actorRoles?, summary? }
 */
function log(guild, eventType, data = {}) {
  if (!guild || !EVENT_TYPES[eventType]) return;
  const guildId = guild.id;

  // 1. Event enabled ? (cache only, 0 DB)
  if (!isEventEnabled(guildId, eventType)) return;

  // 2. Filters (cache only, 0 DB)
  if (!checkFilters(guildId, eventType, data)) return;

  // 3. Route channel (cache only, 0 DB)
  const channelId = getEventChannel(guildId, eventType);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased?.()) return;

  const me = guild.members.me;
  if (!me || !channel.permissionsFor(me)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) return;

  // 4. Build embed (cache only, 0 DB)
  const embed = _buildEmbed(guildId, eventType, data);

  // 5. Fire-and-forget send
  channel.send({ embeds: [embed] }).catch(() => { /* channel supprimé / perms retirées */ });

  // 6. Ring buffer (mémoire)
  _pushRing(guildId, eventType, data);

  // 7. Persistance async (non bloquant)
  setImmediate(() => {
    try {
      STMT_HISTORY_INSERT.run(
        guildId,
        eventType,
        data.actorId || null,
        data.targetId || null,
        data.channelId || null,
        JSON.stringify({
          title      : data.title,
          description: data.description,
          fields     : data.fields,
          summary    : data.summary,
        }),
      );
    } catch { /* ignore */ }
  });

  // 8. Stats daily
  setImmediate(() => {
    try { STMT_STATS_UPSERT.run(guildId, _today(), eventType); } catch { /* ignore */ }
  });

  // 9. Emit pour dashboard temps réel
  logEmitter.emit('log', { guildId, eventType, data, at: Date.now() });
}

function _buildEmbed(guildId, eventType, data) {
  const fmt = getFormat(guildId, eventType);
  const embed = new EmbedBuilder()
    .setColor(fmt.color)
    .setTitle(data.title || `${fmt.icon}  ${fmt.label}`)
    .setTimestamp();

  if (data.description) embed.setDescription(String(data.description).slice(0, 4000));
  if (Array.isArray(data.fields) && data.fields.length) embed.addFields(data.fields.slice(0, 25));
  embed.setFooter({ text: data.footer || `Soulbot V3 • ${eventType}` });

  return embed;
}

function _pushRing(guildId, eventType, data) {
  const arr = ringBuffer.get(guildId) || [];
  arr.unshift({
    ts       : Date.now(),
    type     : eventType,
    summary  : data.summary || data.title || EVENT_TYPES[eventType].label,
    actorId  : data.actorId || null,
    targetId : data.targetId || null,
  });
  if (arr.length > RING_BUFFER_SIZE) arr.length = RING_BUFFER_SIZE;
  ringBuffer.set(guildId, arr);
}

function getRingBuffer(guildId, limit = 20) {
  return (ringBuffer.get(guildId) || []).slice(0, limit);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function getStatsToday(guildId) {
  const rows = STMT_STATS_TODAY.all(guildId, _today());
  const total = rows.reduce((s, r) => s + r.count, 0);
  return {
    total,
    topEvents: rows.slice(0, 5),
    date     : _today(),
  };
}

// ─── Event emitter API pour dashboard ────────────────────────────────────────

function onLog(cb)  { logEmitter.on('log', cb); }
function offLog(cb) { logEmitter.off('log', cb); }

// ─── Reset (purge config V3 d'une guilde) ────────────────────────────────────

function resetConfig(guildId) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM guild_log_routing WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM guild_log_formats WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM guild_log_filters WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM guild_log_config WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM guild_log_events WHERE guild_id = ?').run(guildId);
  });
  tx();
  configCache.delete(guildId);
  for (const k of routingCache.keys()) if (k.startsWith(guildId + ':')) routingCache.delete(k);
  for (const k of formatsCache.keys()) if (k.startsWith(guildId + ':')) formatsCache.delete(k);
  for (const k of filtersCache.keys()) if (k.startsWith(guildId + ':')) filtersCache.delete(k);
  for (const k of togglesCache.keys()) if (k.startsWith(guildId + ':')) togglesCache.delete(k);
  ringBuffer.delete(guildId);
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = {
  EVENT_TYPES,
  EVENT_GROUPS,
  bootstrapCache,
  // Config
  getConfig,
  setDefaultChannel,
  setGlobalEnabled,
  setTheme,
  setCategoryId,
  // Routing
  setEventChannel,
  setGroupChannel,
  getEventChannel,
  clearEventChannel,
  // Events
  isEventEnabled,
  toggleEvent,
  toggleGroup,
  toggleAll,
  // Filters
  addFilter,
  removeFilter,
  checkFilters,
  // Format
  getFormat,
  // Core
  log,
  getRingBuffer,
  // Stats
  getStatsToday,
  // Emitter
  onLog,
  offLog,
  // Reset
  resetConfig,
};
