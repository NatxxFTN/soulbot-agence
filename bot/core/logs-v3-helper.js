'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// LOGS V3 PERFECTION — Le système de logs Discord francophone le plus avancé
//
// Architecture :
//   • 28 events couverts (message_create + 27 events V3)
//   • Rendering : Components V2 (ContainerBuilder, TextDisplayBuilder, ...)
//   • Couleurs sémantiques par groupe (destructif/positif/changes/...)
//   • Section builders par event (riches, structurés, qui/quand/où/quoi)
//   • Compteur d'events par guilde (footer "Event #N")
//   • Cache mémoire complet (config / routing / formats / filters / toggles)
//   • Ring buffer 50 derniers events / guilde
//   • Fire-and-forget : channel.send() jamais await → latence Discord nulle
//   • Persistance async : setImmediate() pour history + stats
//   • EventEmitter logEmitter pour dashboard temps réel
//   • Backwards compat : si payload contient {description, fields} legacy,
//     un fallback générique est rendu en Components V2
// ═══════════════════════════════════════════════════════════════════════════

const { EventEmitter } = require('events');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { db } = require('../database');

// ─── 28 EVENT TYPES ──────────────────────────────────────────────────────────

const EVENT_TYPES = {
  // Messages — activity
  message_create        : { group: 'activity',     icon: '💬', label: 'Message envoyé',        default_enabled: false },

  // Messages — destructif/changes
  message_delete        : { group: 'destructive',  icon: '🗑️', label: 'Message supprimé' },
  message_edit          : { group: 'changes',      icon: '📝', label: 'Message modifié' },
  message_bulk_delete   : { group: 'destructive',  icon: '🧹', label: 'Purge messages' },

  // Members
  member_join           : { group: 'positive',     icon: '🚪', label: 'Membre rejoint' },
  member_leave          : { group: 'neutral',      icon: '👋', label: 'Membre parti' },
  member_ban            : { group: 'destructive',  icon: '🔨', label: 'Membre banni' },
  member_unban          : { group: 'positive',     icon: '🕊️', label: 'Membre débanni' },
  member_kick           : { group: 'moderation',   icon: '👢', label: 'Membre expulsé' },
  member_nickname_change: { group: 'changes',      icon: '🏷️', label: 'Pseudo modifié' },

  // Roles
  role_create           : { group: 'positive',     icon: '✨', label: 'Rôle créé' },
  role_delete           : { group: 'destructive',  icon: '💔', label: 'Rôle supprimé' },
  role_update           : { group: 'changes',      icon: '⚙️', label: 'Rôle modifié' },
  role_permission_change: { group: 'changes',      icon: '🔐', label: 'Permissions rôle modifiées' },

  // Channels
  channel_create        : { group: 'positive',     icon: '📂', label: 'Salon créé' },
  channel_delete        : { group: 'destructive',  icon: '🗂️', label: 'Salon supprimé' },
  channel_update        : { group: 'changes',      icon: '🔧', label: 'Salon modifié' },

  // Voice
  voice_join            : { group: 'voice',        icon: '🎙️', label: 'Rejoint vocal' },
  voice_leave           : { group: 'voice',        icon: '🔇', label: 'Quitte vocal' },
  voice_move            : { group: 'voice',        icon: '↔️', label: 'Déplacement vocal' },

  // Server
  server_update         : { group: 'changes',      icon: '🌐', label: 'Serveur modifié' },
  emoji_update          : { group: 'changes',      icon: '😀', label: 'Emojis modifiés' },
  boost_add             : { group: 'positive',     icon: '🚀', label: 'Boost ajouté' },
  invite_create         : { group: 'neutral',      icon: '🔗', label: 'Invitation créée' },

  // Modération Soulbot
  mod_warn              : { group: 'moderation',   icon: '⚠️', label: 'Avertissement' },
  mod_mute              : { group: 'moderation',   icon: '🤐', label: 'Mute appliqué' },
  mod_unmute            : { group: 'positive',     icon: '🔊', label: 'Mute retiré' },
  mod_timeout           : { group: 'moderation',   icon: '⏲️', label: 'Timeout appliqué' },
};

const EVENT_GROUPS = ['messages', 'members', 'roles', 'channels', 'voice', 'server', 'moderation'];

// Mapping group sémantique → couleur
const COLOR_BY_GROUP = {
  destructive: 0xFF0000, // rouge Soulbot — destructif
  moderation : 0xE74C3C, // rouge clair
  positive   : 0x00FF88, // vert — créations
  changes    : 0xFFB800, // jaune — modifications
  activity   : 0x5865F2, // bleu Discord — activité
  voice      : 0x9B59B6, // violet — vocal
  neutral    : 0x95A5A6, // gris — neutre
};

// Group "messages/members/...etc" exposé pour panel — calculé depuis label
const PANEL_GROUP_OF_EVENT = {
  message_create: 'messages', message_delete: 'messages', message_edit: 'messages', message_bulk_delete: 'messages',
  member_join: 'members', member_leave: 'members', member_ban: 'members', member_unban: 'members',
  member_kick: 'members', member_nickname_change: 'members',
  role_create: 'roles', role_delete: 'roles', role_update: 'roles', role_permission_change: 'roles',
  channel_create: 'channels', channel_delete: 'channels', channel_update: 'channels',
  voice_join: 'voice', voice_leave: 'voice', voice_move: 'voice',
  server_update: 'server', emoji_update: 'server', boost_add: 'server', invite_create: 'server',
  mod_warn: 'moderation', mod_mute: 'moderation', mod_unmute: 'moderation', mod_timeout: 'moderation',
};

function eventColor(eventType) {
  const g = EVENT_TYPES[eventType]?.group;
  return COLOR_BY_GROUP[g] ?? 0x95A5A6;
}

function panelGroupOf(eventType) {
  return PANEL_GROUP_OF_EVENT[eventType] ?? 'server';
}

// ─── Caches mémoire ──────────────────────────────────────────────────────────

const configCache  = new Map();   // guildId → { global_enabled, default_channel_id, theme, category_id, version }
const routingCache = new Map();   // "guildId:event_type" → channel_id
const formatsCache = new Map();   // "guildId:event_type" → { template, color_hex, icon_emoji, enabled }
const filtersCache = new Map();   // "guildId:event_type" → [{ id, type, value }, ...]
const togglesCache = new Map();   // "guildId:event_type" → boolean

const ringBuffer = new Map();     // guildId → [{ ts, type, summary, actorId, targetId }, ...]
const RING_BUFFER_SIZE = 50;

const eventCounters = new Map();  // guildId → number (compteur cumulé)

const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(50);

// ─── Prepared statements ─────────────────────────────────────────────────────

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

const STMT_ROUTING_UPSERT = db.prepare(`
  INSERT INTO guild_log_routing (guild_id, event_type, channel_id)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id, event_type) DO UPDATE SET channel_id = excluded.channel_id
`);
const STMT_ROUTING_DELETE = db.prepare('DELETE FROM guild_log_routing WHERE guild_id = ? AND event_type = ?');

const STMT_FORMATS_UPSERT = db.prepare(`
  INSERT INTO guild_log_formats (guild_id, event_type, template, color_hex, icon_emoji, enabled)
  VALUES (?, ?, ?, ?, ?, 1)
  ON CONFLICT(guild_id, event_type) DO UPDATE SET
    template   = excluded.template,
    color_hex  = excluded.color_hex,
    icon_emoji = excluded.icon_emoji
`);

const STMT_FILTERS_INSERT = db.prepare(`
  INSERT INTO guild_log_filters (guild_id, event_type, filter_type, filter_value)
  VALUES (?, ?, ?, ?)
`);
const STMT_FILTERS_DELETE = db.prepare('DELETE FROM guild_log_filters WHERE id = ? AND guild_id = ?');

const STMT_TOGGLES_UPSERT = db.prepare(`
  INSERT INTO guild_log_events (guild_id, event_type, enabled)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id, event_type) DO UPDATE SET enabled = excluded.enabled
`);

const STMT_HISTORY_INSERT = db.prepare(`
  INSERT INTO guild_log_history (guild_id, event_type, actor_id, target_id, channel_id, data_json)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const STMT_STATS_UPSERT = db.prepare(`
  INSERT INTO guild_log_stats_daily (guild_id, date, event_type, count)
  VALUES (?, ?, ?, 1)
  ON CONFLICT(guild_id, date, event_type) DO UPDATE SET count = count + 1
`);
const STMT_STATS_TODAY = db.prepare(`
  SELECT event_type, count FROM guild_log_stats_daily
  WHERE guild_id = ? AND date = ?
  ORDER BY count DESC
`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _key(guildId, eventType) { return `${guildId}:${eventType}`; }
function _today() { return new Date().toISOString().slice(0, 10); }

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(bytes >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function truncate(str, max = 1500) {
  if (!str) return str;
  if (str.length <= max) return str;
  return str.slice(0, max) + '\n…(tronqué)';
}

function nowSec() { return Math.floor(Date.now() / 1000); }

function incrementEventCounter(guildId) {
  const next = (eventCounters.get(guildId) || 0) + 1;
  eventCounters.set(guildId, next);
  return next;
}

function getEventCounter(guildId) {
  return eventCounters.get(guildId) || 0;
}

// ─── Bootstrap caches ────────────────────────────────────────────────────────

function bootstrapCache() {
  configCache.clear();
  routingCache.clear();
  formatsCache.clear();
  filtersCache.clear();
  togglesCache.clear();

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

  const routings = db.prepare('SELECT guild_id, event_type, channel_id FROM guild_log_routing').all();
  for (const r of routings) routingCache.set(_key(r.guild_id, r.event_type), r.channel_id);

  const formats = db.prepare('SELECT * FROM guild_log_formats').all();
  for (const f of formats) {
    formatsCache.set(_key(f.guild_id, f.event_type), {
      template  : f.template,
      color_hex : f.color_hex,
      icon_emoji: f.icon_emoji,
      enabled   : f.enabled !== 0,
    });
  }

  const filters = db.prepare('SELECT * FROM guild_log_filters').all();
  for (const f of filters) {
    const k = _key(f.guild_id, f.event_type);
    if (!filtersCache.has(k)) filtersCache.set(k, []);
    filtersCache.get(k).push({ id: f.id, type: f.filter_type, value: f.filter_value });
  }

  const toggles = db.prepare('SELECT guild_id, event_type, enabled FROM guild_log_events').all();
  for (const t of toggles) togglesCache.set(_key(t.guild_id, t.event_type), t.enabled !== 0);

  console.log(`[logs-v3] bootstrapCache: ${configs.length} configs · ${routings.length} routings · ${formats.length} formats · ${filters.length} filters · ${toggles.length} toggles`);

  // ─── Migration auto : message_create pour guildes V3 existantes ─────────
  let migrated = 0;
  for (const c of configs) {
    if (c.version !== 'v3') continue;
    const k = _key(c.guild_id, 'message_create');
    if (togglesCache.has(k)) continue; // déjà migré

    // Toggle = OFF par défaut, route = default_channel_id
    const insertToggle = db.prepare('INSERT OR IGNORE INTO guild_log_events (guild_id, event_type, enabled) VALUES (?, ?, 0)');
    insertToggle.run(c.guild_id, 'message_create');
    togglesCache.set(k, false);

    const defaultChannel = c.default_channel_id || c.channel_id;
    if (defaultChannel) {
      const insertRoute = db.prepare('INSERT OR IGNORE INTO guild_log_routing (guild_id, event_type, channel_id) VALUES (?, ?, ?)');
      insertRoute.run(c.guild_id, 'message_create', defaultChannel);
      routingCache.set(k, defaultChannel);
    }

    // Filter ignore_bot
    const existingFilters = db.prepare("SELECT id FROM guild_log_filters WHERE guild_id = ? AND event_type = ? AND filter_type = 'ignore_bot'").get(c.guild_id, 'message_create');
    if (!existingFilters) {
      const res = STMT_FILTERS_INSERT.run(c.guild_id, 'message_create', 'ignore_bot', 'true');
      if (!filtersCache.has(k)) filtersCache.set(k, []);
      filtersCache.get(k).push({ id: res.lastInsertRowid, type: 'ignore_bot', value: 'true' });
    }

    migrated++;
  }
  if (migrated > 0) {
    console.log(`[logs-v3] auto-migrated message_create for ${migrated} V3 guild(s)`);
  }
}

function bootstrapGuildCache(guildId) {
  // Clear puis reload pour 1 guilde uniquement
  configCache.delete(guildId);
  for (const k of [...routingCache.keys()]) if (k.startsWith(`${guildId}:`)) routingCache.delete(k);
  for (const k of [...formatsCache.keys()]) if (k.startsWith(`${guildId}:`)) formatsCache.delete(k);
  for (const k of [...filtersCache.keys()]) if (k.startsWith(`${guildId}:`)) filtersCache.delete(k);
  for (const k of [...togglesCache.keys()]) if (k.startsWith(`${guildId}:`)) togglesCache.delete(k);

  const c = STMT_CONFIG_GET.get(guildId);
  if (c) {
    configCache.set(guildId, {
      global_enabled     : c.global_enabled !== 0,
      default_channel_id : c.default_channel_id || c.channel_id || null,
      theme              : c.theme || 'premium',
      category_id        : c.category_id || null,
      version            : c.version || 'v2',
    });
  }

  const routings = db.prepare('SELECT event_type, channel_id FROM guild_log_routing WHERE guild_id = ?').all(guildId);
  for (const r of routings) routingCache.set(_key(guildId, r.event_type), r.channel_id);

  const formats = db.prepare('SELECT * FROM guild_log_formats WHERE guild_id = ?').all(guildId);
  for (const f of formats) {
    formatsCache.set(_key(guildId, f.event_type), {
      template  : f.template,
      color_hex : f.color_hex,
      icon_emoji: f.icon_emoji,
      enabled   : f.enabled !== 0,
    });
  }

  const filters = db.prepare('SELECT * FROM guild_log_filters WHERE guild_id = ?').all(guildId);
  for (const f of filters) {
    const k = _key(guildId, f.event_type);
    if (!filtersCache.has(k)) filtersCache.set(k, []);
    filtersCache.get(k).push({ id: f.id, type: f.filter_type, value: f.filter_value });
  }

  const toggles = db.prepare('SELECT event_type, enabled FROM guild_log_events WHERE guild_id = ?').all(guildId);
  for (const t of toggles) togglesCache.set(_key(guildId, t.event_type), t.enabled !== 0);
}

function invalidateGuildCache(guildId) {
  configCache.delete(guildId);
  for (const k of [...routingCache.keys()]) if (k.startsWith(`${guildId}:`)) routingCache.delete(k);
  for (const k of [...formatsCache.keys()]) if (k.startsWith(`${guildId}:`)) formatsCache.delete(k);
  for (const k of [...filtersCache.keys()]) if (k.startsWith(`${guildId}:`)) filtersCache.delete(k);
  for (const k of [...togglesCache.keys()]) if (k.startsWith(`${guildId}:`)) togglesCache.delete(k);
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

// ─── Toggles ─────────────────────────────────────────────────────────────────

function isEventEnabled(guildId, eventType) {
  const cfg = getConfig(guildId);
  if (!cfg.global_enabled) return false;
  const k = _key(guildId, eventType);
  if (togglesCache.has(k)) return togglesCache.get(k);
  // Pas de row → fallback sur EVENT_TYPES.default_enabled (par défaut true)
  const meta = EVENT_TYPES[eventType];
  return meta?.default_enabled !== false;
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

// ─── Format resolver (custom override > default) ─────────────────────────────

function getFormat(guildId, eventType) {
  const custom = formatsCache.get(_key(guildId, eventType));
  const base = EVENT_TYPES[eventType];
  if (!base) return null;

  return {
    color : custom?.color_hex ? parseInt(custom.color_hex.replace('#', ''), 16) : eventColor(eventType),
    icon  : custom?.icon_emoji || base.icon,
    label : base.label,
    template: custom?.template || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION BUILDERS — Le cœur du rendering premium par event
// Chaque builder retourne un array<string|null>. null = section omise.
// ═══════════════════════════════════════════════════════════════════════════

const SECTION_BUILDERS = {};

// ── Helpers de rendu communs ─────────────────────────────────────────────────

function _renderUserBlock(user, member) {
  if (!user) return '_(utilisateur inconnu)_';
  const lines = [
    `<@${user.id}> (\`${user.username || user.tag || 'unknown'}\`)`,
    `**ID** : \`${user.id}\``,
  ];
  if (member?.nickname) lines.push(`**Pseudo serveur** : \`${member.nickname}\``);
  if (member?.joinedTimestamp) lines.push(`**Membre depuis** : <t:${Math.floor(member.joinedTimestamp/1000)}:R>`);
  return lines.join('\n');
}

function _renderChannelBlock(channel) {
  if (!channel) return '_(salon inconnu)_';
  const lines = [`**Salon** : <#${channel.id}> (\`${channel.name || '?'}\`)`];
  lines.push(`**ID salon** : \`${channel.id}\``);
  if (channel.parent) lines.push(`**Catégorie** : \`${channel.parent.name}\``);
  return lines.join('\n');
}

function _renderTimestamp(ts, label = 'Date') {
  const sec = Math.floor((ts || Date.now()) / 1000);
  return `<t:${sec}:F>\n(<t:${sec}:R>)`;
}

// ── 28 SECTION BUILDERS ──────────────────────────────────────────────────────

SECTION_BUILDERS['message_create'] = (data) => [
  `## 👤 Auteur\n${_renderUserBlock(data.author, data.member)}`,
  `## 📍 Localisation\n${_renderChannelBlock(data.channel)}`,
  `## 🕐 Envoyé\n${_renderTimestamp(data.timestamp)}`,
  data.content
    ? `## 💬 Contenu\n>>> ${truncate(data.content, 1500)}`
    : `## 💬 Contenu\n_(message vide ou attachement seulement)_`,
  data.attachments?.length
    ? `## 📎 Pièces jointes (${data.attachments.length})\n` +
      data.attachments.map(a => `• [${a.name}](${a.url}) — \`${formatBytes(a.size)}\`` + (a.contentType ? ` • \`${a.contentType}\`` : '')).join('\n')
    : null,
  (data.mentions && (data.mentions.users + data.mentions.roles + data.mentions.channels > 0 || data.mentions.everyone))
    ? `## 🔔 Mentions\n**Users** : ${data.mentions.users} • **Rôles** : ${data.mentions.roles} • **Salons** : ${data.mentions.channels}` +
      (data.mentions.everyone ? '\n@everyone/@here ✓' : '')
    : null,
  (data.embedsCount || data.stickersCount)
    ? `## 🎨 Médias\n` +
      (data.embedsCount ? `**Embeds** : ${data.embedsCount}` : '') +
      (data.stickersCount ? `${data.embedsCount ? '\n' : ''}**Stickers** : ${data.stickersCount}` : '')
    : null,
  data.messageUrl ? `## 🔗 [Aller au message](${data.messageUrl})` : null,
];

SECTION_BUILDERS['message_delete'] = (data) => [
  `## 👤 Auteur original\n` + (data.author
    ? `<@${data.author.id}> (\`${data.author.username || data.author.tag}\`)\n**ID** : \`${data.author.id}\``
    : `_(auteur inconnu — message non en cache)_`),
  `## 📍 Localisation\n${_renderChannelBlock(data.channel)}`,
  data.createdTimestamp ? `## 🕐 Envoyé initialement\n<t:${Math.floor(data.createdTimestamp/1000)}:F>` : null,
  `## 🗑️ Supprimé\n${_renderTimestamp(Date.now())}`,
  data.content
    ? `## 💬 Contenu supprimé\n>>> ${truncate(data.content, 1500)}`
    : `## 💬 Contenu supprimé\n_(non disponible — message non en cache)_`,
  data.attachments?.length
    ? `## 📎 Pièces jointes (${data.attachments.length})\n` +
      data.attachments.map(a => `• \`${a.name || 'fichier'}\` (${formatBytes(a.size)})`).join('\n')
    : null,
  data.messageId ? `## 🆔 ID message\n\`${data.messageId}\`` : null,
];

SECTION_BUILDERS['message_edit'] = (data) => [
  `## 👤 Auteur\n${_renderUserBlock(data.author, data.member)}`,
  `## 📍 Salon\n<#${data.channel?.id}>`,
  `## 🕐 Modifié\n${_renderTimestamp(Date.now())}`,
  `## 📝 Avant\n>>> ${truncate(data.oldContent || '_(vide)_', 800)}`,
  `## ✏️ Après\n>>> ${truncate(data.newContent || '_(vide)_', 800)}`,
  data.messageUrl ? `## 🔗 [Aller au message](${data.messageUrl})` : null,
];

SECTION_BUILDERS['message_bulk_delete'] = (data) => [
  `## 📍 Salon\n${_renderChannelBlock(data.channel)}`,
  `## 🧹 Messages purgés\n**${data.count}** message(s) supprimé(s) en lot`,
  `## 🕐 Date\n${_renderTimestamp(Date.now())}`,
  data.executor ? `## 👮 Exécuté par\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)` : null,
];

SECTION_BUILDERS['member_join'] = (data, guild) => {
  const ageMs = Date.now() - (data.user?.createdTimestamp || Date.now());
  const youngWarn = ageMs < 7 * 24 * 60 * 60 * 1000 ? `\n⚠️ **Compte créé il y a moins de 7 jours**` : '';
  return [
    `## 👤 Nouveau membre\n${_renderUserBlock(data.user)}`,
    data.user?.createdTimestamp
      ? `## 📅 Compte créé\n<t:${Math.floor(data.user.createdTimestamp/1000)}:F>\n(<t:${Math.floor(data.user.createdTimestamp/1000)}:R>)${youngWarn}`
      : null,
    `## 🚪 Rejoint le serveur\n${_renderTimestamp(Date.now())}`,
    `## 📊 Stats\n**Total membres** : ${guild.memberCount}\n${data.user?.bot ? '**Type** : 🤖 Bot' : '**Type** : 👤 Humain'}`,
  ];
};

SECTION_BUILDERS['member_leave'] = (data, guild) => {
  const roles = data.member?.roles?.cache
    ? Array.from(data.member.roles.cache.values()).filter(r => r.id !== guild.id)
    : [];
  return [
    `## 👤 Membre parti\n**${data.user.username || data.user.tag}** (\`${data.user.id}\`)`,
    data.member?.joinedTimestamp
      ? `## 📅 Avait rejoint\n<t:${Math.floor(data.member.joinedTimestamp/1000)}:F>\n(<t:${Math.floor(data.member.joinedTimestamp/1000)}:R>)`
      : null,
    `## 🚪 Parti\n${_renderTimestamp(Date.now())}`,
    roles.length > 0
      ? `## 🎭 Rôles avant départ (${roles.length})\n` + roles.map(r => `<@&${r.id}>`).slice(0, 20).join(', ')
      : null,
    `## 📊 Total membres\n${guild.memberCount}`,
  ];
};

SECTION_BUILDERS['member_ban'] = (data) => [
  `## 🔨 Membre banni\n**${data.user.username || data.user.tag}** (\`${data.user.id}\`)\n<@${data.user.id}>`,
  data.executor
    ? `## 👮 Banni par\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)`
    : `## 👮 Banni par\n_(via API ou bot externe)_`,
  data.reason ? `## 📋 Raison\n>>> ${truncate(data.reason, 1000)}` : `## 📋 Raison\n_(aucune raison fournie)_`,
  `## 🕐 Date du ban\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['member_unban'] = (data) => [
  `## 🕊️ Membre débanni\n**${data.user.username || data.user.tag}** (\`${data.user.id}\`)`,
  data.executor ? `## 👮 Débanni par\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)` : null,
  `## 🕐 Date\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['member_kick'] = (data) => [
  `## 👢 Membre expulsé\n${_renderUserBlock(data.user, data.member)}`,
  data.executor
    ? `## 👮 Expulsé par\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)`
    : `## 👮 Expulsé par\n_(via API)_`,
  data.reason ? `## 📋 Raison\n>>> ${truncate(data.reason, 1000)}` : `## 📋 Raison\n_(aucune raison fournie)_`,
  `## 🕐 Date\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['member_nickname_change'] = (data) => [
  `## 👤 Membre\n${_renderUserBlock(data.user, data.member)}`,
  `## 🏷️ Avant\n\`${data.oldNickname || data.user.username}\``,
  `## ✏️ Après\n\`${data.newNickname || data.user.username}\``,
  `## 🕐 Modifié\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['role_create'] = (data, guild) => {
  const hex = data.color ? `#${data.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';
  return [
    `## ✨ Rôle créé\n<@&${data.roleId}> (\`${data.name}\`)\n**ID** : \`${data.roleId}\``,
    `## 🎨 Apparence\n**Couleur** : \`${hex}\`\n**Position** : ${data.position}\n**Épinglé** : ${data.hoist ? 'Oui' : 'Non'}\n**Mentionnable** : ${data.mentionable ? 'Oui' : 'Non'}`,
    data.permissions?.length ? `## 🔐 Permissions (${data.permissions.length})\n${data.permissions.slice(0, 12).map(p => `\`${p}\``).join(' · ')}${data.permissions.length > 12 ? ` …+${data.permissions.length - 12}` : ''}` : null,
    `## 🕐 Créé\n${_renderTimestamp(Date.now())}`,
    `## 📊 Total rôles\n${guild.roles.cache.size}`,
  ];
};

SECTION_BUILDERS['role_delete'] = (data) => {
  const hex = data.color ? `#${data.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';
  return [
    `## 💔 Rôle supprimé\n**${data.name}**\n**ID** : \`${data.roleId}\``,
    `## 🎨 Apparence\n**Couleur** : \`${hex}\`\n**Position** : ${data.position}`,
    `## 👥 Membres concernés\n**${data.memberCount}** membre(s) avaient ce rôle`,
    `## 🕐 Supprimé\n${_renderTimestamp(Date.now())}`,
  ];
};

SECTION_BUILDERS['role_update'] = (data) => [
  `## ⚙️ Rôle modifié\n<@&${data.roleId}> (\`${data.name}\`)\n**ID** : \`${data.roleId}\``,
  data.diffs?.length ? `## 📝 Changements\n${data.diffs.map(d => `• ${d}`).join('\n')}` : `## 📝 Changements\n_(aucun changement notable)_`,
  `## 🕐 Modifié\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['role_permission_change'] = (data) => [
  `## 🔐 Permissions modifiées\n<@&${data.roleId}> (\`${data.name}\`)`,
  data.added?.length ? `## ➕ Permissions ajoutées\n${data.added.map(p => `\`${p}\``).join(' · ')}` : null,
  data.removed?.length ? `## ➖ Permissions retirées\n${data.removed.map(p => `\`${p}\``).join(' · ')}` : null,
  `## 🕐 Modifié\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['channel_create'] = (data, guild) => [
  `## 📂 Salon créé\n<#${data.channelId}> (\`${data.name}\`)\n**ID** : \`${data.channelId}\``,
  `## 📋 Détails\n**Type** : \`${data.typeLabel}\`\n**Catégorie** : ${data.parentName ? `\`${data.parentName}\`` : '_(aucune)_'}` + (data.topic ? `\n**Sujet** : ${truncate(data.topic, 200)}` : ''),
  data.executor ? `## 👮 Créé par\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)` : null,
  `## 🕐 Créé\n${_renderTimestamp(Date.now())}`,
  `## 📊 Total salons\n${guild.channels.cache.size}`,
];

SECTION_BUILDERS['channel_delete'] = (data) => [
  `## 🗂️ Salon supprimé\n**\`#${data.name}\`**\n**ID** : \`${data.channelId}\``,
  `## 📋 Détails\n**Type** : \`${data.typeLabel}\`\n**Catégorie** : ${data.parentName ? `\`${data.parentName}\`` : '_(aucune)_'}`,
  data.executor ? `## 👮 Supprimé par\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)` : null,
  `## 🕐 Supprimé\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['channel_update'] = (data) => [
  `## 🔧 Salon modifié\n<#${data.channelId}> (\`${data.name}\`)`,
  data.diffs?.length ? `## 📝 Changements\n${data.diffs.map(d => `• ${d}`).join('\n')}` : `## 📝 Changements\n_(aucun changement notable)_`,
  `## 🕐 Modifié\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['voice_join'] = (data) => [
  `## 🎙️ Membre vocal\n${_renderUserBlock(data.user, data.member)}`,
  `## 📍 Rejoint\n<#${data.channelId}> (\`${data.channelName || '?'}\`)`,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['voice_leave'] = (data) => [
  `## 🔇 Membre quitté vocal\n${_renderUserBlock(data.user, data.member)}`,
  `## 📍 Quitté\n<#${data.channelId}> (\`${data.channelName || '?'}\`)`,
  data.durationSec ? `## ⏱️ Durée\n${Math.floor(data.durationSec/60)}m ${data.durationSec%60}s` : null,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['voice_move'] = (data) => [
  `## ↔️ Déplacement vocal\n${_renderUserBlock(data.user, data.member)}`,
  `## 📤 Depuis\n<#${data.fromChannelId}> (\`${data.fromName || '?'}\`)`,
  `## 📥 Vers\n<#${data.toChannelId}> (\`${data.toName || '?'}\`)`,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['server_update'] = (data) => [
  `## 🌐 Serveur modifié`,
  data.diffs?.length ? `## 📝 Changements\n${data.diffs.map(d => `• ${d}`).join('\n')}` : `## 📝 Changements\n_(aucun changement notable)_`,
  data.executor ? `## 👮 Modifié par\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)` : null,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['emoji_update'] = (data) => [
  `## 😀 Emojis modifiés`,
  data.added?.length ? `## ➕ Ajoutés (${data.added.length})\n${data.added.map(em => `${em.toString ? em.toString() : ''} \`${em.name}\``).join(' · ')}` : null,
  data.removed?.length ? `## ➖ Retirés (${data.removed.length})\n${data.removed.map(em => `\`${em.name}\``).join(' · ')}` : null,
  data.renamed?.length ? `## ✏️ Renommés (${data.renamed.length})\n${data.renamed.map(r => `\`${r.from}\` → \`${r.to}\``).join('\n')}` : null,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['boost_add'] = (data, guild) => [
  `## 🚀 Boost serveur\n${_renderUserBlock(data.user, data.member)}`,
  `## 📊 Stats serveur\n**Niveau** : ${guild.premiumTier}\n**Boosts** : ${guild.premiumSubscriptionCount || 0}`,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['invite_create'] = (data) => [
  `## 🔗 Invitation créée\n\`${data.code}\`\nhttps://discord.gg/${data.code}`,
  data.inviter ? `## 👤 Créée par\n<@${data.inviter.id}> (\`${data.inviter.username || data.inviter.tag}\`)` : null,
  `## 📍 Salon cible\n<#${data.channelId}>`,
  `## 📋 Détails\n**Usages max** : ${data.maxUses === 0 ? '∞' : data.maxUses}\n**Expire** : ${data.expiresTimestamp ? `<t:${Math.floor(data.expiresTimestamp/1000)}:R>` : 'Jamais'}\n**Temporaire** : ${data.temporary ? 'Oui' : 'Non'}`,
  `## 🕐 Créée\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['mod_warn'] = (data) => [
  `## ⚠️ Avertissement\n${_renderUserBlock(data.user, data.member)}`,
  `## 👮 Modérateur\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)`,
  data.reason ? `## 📋 Raison\n>>> ${truncate(data.reason, 1000)}` : `## 📋 Raison\n_(aucune)_`,
  data.warnCount ? `## 📊 Total avertissements\n**${data.warnCount}**` : null,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['mod_mute'] = (data) => [
  `## 🤐 Mute appliqué\n${_renderUserBlock(data.user, data.member)}`,
  `## 👮 Modérateur\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)`,
  data.duration ? `## ⏱️ Durée\n${data.duration}` : null,
  data.reason ? `## 📋 Raison\n>>> ${truncate(data.reason, 1000)}` : `## 📋 Raison\n_(aucune)_`,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['mod_unmute'] = (data) => [
  `## 🔊 Mute retiré\n${_renderUserBlock(data.user, data.member)}`,
  `## 👮 Modérateur\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)`,
  data.reason ? `## 📋 Raison\n>>> ${truncate(data.reason, 1000)}` : null,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

SECTION_BUILDERS['mod_timeout'] = (data) => [
  `## ⏲️ Timeout appliqué\n${_renderUserBlock(data.user, data.member)}`,
  `## 👮 Modérateur\n<@${data.executor.id}> (\`${data.executor.username || data.executor.tag}\`)`,
  data.duration ? `## ⏱️ Durée\n${data.duration}` : null,
  data.reason ? `## 📋 Raison\n>>> ${truncate(data.reason, 1000)}` : null,
  `## 🕐 À\n${_renderTimestamp(Date.now())}`,
];

// ═══════════════════════════════════════════════════════════════════════════
// CORE BUILDER — buildLogContainer (Components V2)
// ═══════════════════════════════════════════════════════════════════════════

function _separator() {
  return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
}

function _text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function buildLogContainer(eventType, data, guild) {
  const meta = EVENT_TYPES[eventType];
  const fmt = getFormat(guild.id, eventType);
  const icon = fmt.icon;
  const label = fmt.label;
  const color = fmt.color;
  const eventNum = incrementEventCounter(guild.id);

  const container = new ContainerBuilder().setAccentColor(color);

  // Header
  container.addTextDisplayComponents(_text(`# ${icon} ${label}`));
  container.addSeparatorComponents(_separator());

  // Sections
  let sections = [];
  if (typeof SECTION_BUILDERS[eventType] === 'function') {
    sections = SECTION_BUILDERS[eventType](data, guild) || [];
  } else if (data.description || data.fields?.length) {
    // Fallback legacy : payload {description, fields}
    if (data.description) sections.push(`## 📋 Détails\n${truncate(data.description, 2000)}`);
    if (data.fields?.length) {
      sections.push(`## ℹ️ Informations\n` + data.fields.map(f => `**${f.name}** : ${f.value}`).join('\n'));
    }
  } else {
    sections.push(`## ℹ️ Event\n_(aucune section dédiée pour \`${eventType}\`)_`);
  }

  for (const sectionContent of sections) {
    if (!sectionContent) continue;
    container.addTextDisplayComponents(_text(truncate(String(sectionContent), 3900)));
  }

  // Footer
  container.addSeparatorComponents(_separator());
  container.addTextDisplayComponents(_text(
    `-# Soulbot • Logs V3 • Event #${eventNum} • \`${eventType}\` • <t:${nowSec()}:R>`
  ));

  return container;
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE log() — fire-and-forget
// ═══════════════════════════════════════════════════════════════════════════

function log(guild, eventType, data = {}) {
  if (!guild || !EVENT_TYPES[eventType]) return;
  const guildId = guild.id;

  if (!isEventEnabled(guildId, eventType)) return;
  if (!checkFilters(guildId, eventType, data)) return;

  const channelId = getEventChannel(guildId, eventType);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased?.()) return;

  const me = guild.members.me;
  if (!me || !channel.permissionsFor(me)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) return;

  try {
    const container = buildLogContainer(eventType, data, guild);

    channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    }).catch((err) => {
      // Si Components V2 unsupported (vieille version DJS), tentative fallback embed simple
      // mais pour V3 perfection on suppose DJS v14.16+
      // console.warn(`[logs-v3] send fail ${eventType}: ${err?.message}`);
    });

    _pushRing(guildId, eventType, data);

    setImmediate(() => {
      try {
        STMT_HISTORY_INSERT.run(
          guildId,
          eventType,
          data.actorId || data.executor?.id || null,
          data.targetId || data.user?.id || null,
          data.channelId || data.channel?.id || null,
          JSON.stringify({
            summary: data.summary,
            messageId: data.messageId,
            roleId: data.roleId,
          }).slice(0, 4000),
        );
      } catch { /* ignore */ }
    });

    setImmediate(() => {
      try { STMT_STATS_UPSERT.run(guildId, _today(), eventType); } catch { /* ignore */ }
    });

    logEmitter.emit('log', { guildId, eventType, data, at: Date.now() });
  } catch (err) {
    console.error(`[logs-v3] Error rendering ${eventType}:`, err.message);
  }
}

function _pushRing(guildId, eventType, data) {
  const arr = ringBuffer.get(guildId) || [];
  arr.unshift({
    ts       : Date.now(),
    type     : eventType,
    summary  : data.summary || data.title || EVENT_TYPES[eventType].label,
    actorId  : data.actorId || data.executor?.id || null,
    targetId : data.targetId || data.user?.id || null,
  });
  if (arr.length > RING_BUFFER_SIZE) arr.length = RING_BUFFER_SIZE;
  ringBuffer.set(guildId, arr);
}

function getRingBuffer(guildId, limit = 20) {
  return (ringBuffer.get(guildId) || []).slice(0, limit);
}

// Backwards compat alias
function getViewBuffer(guildId) {
  return getRingBuffer(guildId, RING_BUFFER_SIZE);
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

// ─── Event emitter API ───────────────────────────────────────────────────────

function onLog(cb)  { logEmitter.on('log', cb); }
function offLog(cb) { logEmitter.off('log', cb); }

// ─── Reset ───────────────────────────────────────────────────────────────────

function resetConfig(guildId) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM guild_log_routing WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM guild_log_formats WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM guild_log_filters WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM guild_log_config WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM guild_log_events WHERE guild_id = ?').run(guildId);
  });
  tx();
  invalidateGuildCache(guildId);
  ringBuffer.delete(guildId);
  eventCounters.delete(guildId);
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = {
  EVENT_TYPES,
  EVENT_GROUPS,
  COLOR_BY_GROUP,
  bootstrapCache,
  bootstrapGuildCache,
  invalidateGuildCache,
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
  // Toggles
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
  eventColor,
  panelGroupOf,
  // Core
  log,
  buildLogContainer,
  getRingBuffer,
  getViewBuffer,
  getEventCounter,
  // Stats
  getStatsToday,
  // Emitter
  onLog,
  offLog,
  // Reset
  resetConfig,
};
