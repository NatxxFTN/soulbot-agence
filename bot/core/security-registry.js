'use strict';

// ═══════════════════════════════════════════════
// SECURITY REGISTRY — V5 (Security Studio)
// Façade unique au-dessus des 3 stores de config sécurité :
//   · security_config   (12 features Forteresse)  → security-storage
//   · antispam_config   (V4)                      → antispam-helper
//   · antileak_config   (V4)                      → antileak-helper
// AUCUNE migration de données : les tables existantes restent la
// source de vérité, le registry les expose derrière une API unifiée.
// Échelle de sanction canonique : none·delete·warn·timeout·kick·ban
// (+ timeout_minutes par module). Les valeurs legacy (mute_5m, mute_1h)
// sont normalisées À LA LECTURE — la DB n'est pas réécrite.
// ═══════════════════════════════════════════════

const storage = require('./security-storage');
const antispamHelper = require('./antispam-helper');
const antileakHelper = require('./antileak-helper');
const ladder = require('./security-ladder');

// ─── Catalogue des 15 modules ────────────────────────────────────────────────

const MODULES = [
  // Forteresse — messages
  { key: 'antilink',       label: 'Anti-Link',        cat: 'messages', store: 'fortress', emoji: 'ui_git',          desc: 'Bloque les liens HTTP/HTTPS' },
  { key: 'antiinvite',     label: 'Anti-Invite',      cat: 'messages', store: 'fortress', emoji: 'ui_mail',         desc: 'Bloque les invitations Discord' },
  // ui_members/ui_user vivent sur 1063235055356493887 ; la garde
  // isEmojiUsable les écarte proprement si le bot n'y est pas (pas de crash).
  { key: 'antieveryone',   label: 'Anti-@everyone',   cat: 'messages', store: 'fortress', emoji: 'ui_members',      desc: 'Bloque @everyone / @here' },
  { key: 'antimention',    label: 'Anti-Mention',     cat: 'messages', store: 'fortress', emoji: 'ui_user',         desc: 'Anti-spam de mentions' },
  { key: 'antiduplicate',  label: 'Anti-Duplicate',   cat: 'messages', store: 'fortress', emoji: 'ui_chat',         desc: 'Anti-flood messages identiques' },
  { key: 'antiwords',      label: 'Filtre de mots',   cat: 'messages', store: 'fortress', emoji: 'btn_edit',        desc: 'Mots interdits personnalisés' },
  { key: 'anticaps',       label: 'Anti-Caps',        cat: 'messages', store: 'fortress', emoji: 'ui_speaker',      desc: 'Anti-majuscules excessives' },
  { key: 'antiemojispam',  label: 'Anti-Emoji',       cat: 'messages', store: 'fortress', emoji: 'ui_smiley',       desc: 'Anti-spam d\'emojis' },
  { key: 'antinsfw',       label: 'Anti-Explicit',    cat: 'messages', store: 'fortress', emoji: 'btn_error',       desc: 'Détection de contenu explicite' },
  // V4 — messages (tables dédiées)
  { key: 'antispam',       label: 'Anti-Spam',        cat: 'messages', store: 'antispam', emoji: 'ui_antispam',     desc: 'Flood · mentions · répétitions · caps' },
  { key: 'antileak',       label: 'Anti-Leak',        cat: 'messages', store: 'antileak', emoji: 'ui_antileak',     desc: 'Tokens · IP · emails · téléphones' },
  // Forteresse — arrivées
  { key: 'antibot',        label: 'Anti-Bot',         cat: 'joins',    store: 'fortress', emoji: 'cat_protection',  desc: 'Bloque l\'ajout de bots' },
  { key: 'antiraid',       label: 'Anti-Raid',        cat: 'joins',    store: 'fortress', emoji: 'cat_protection',  desc: 'Détection de raids (joins massifs)' },
  { key: 'antinewaccount', label: 'Anti-Newaccount',  cat: 'joins',    store: 'fortress', emoji: 'ui_pin',          desc: 'Refuse les comptes trop récents' },
  // SOC — serveur
  { key: 'antinuke',       label: 'Anti-Nuke',        cat: 'server',   store: 'fortress', emoji: 'ui_lock',         desc: 'Actions de masse par un modérateur (bans, kicks, salons supprimés)' },
];

const MODULES_BY_KEY = new Map(MODULES.map(m => [m.key, m]));

const UNIFIED_SANCTIONS = ['none', 'delete', 'warn', 'timeout', 'kick', 'ban'];

// ─── Normalisation de sanction (lecture seule — la DB n'est pas réécrite) ────

/**
 * Traduit une valeur de sanction legacy vers l'échelle canonique.
 * @param {string} raw - valeur DB ('mute_5m', 'timeout', 'ban', …)
 * @returns {{sanction: string, timeoutMinutes: ?number}}
 */
function normalizeSanction(raw) {
  switch (raw) {
    case 'mute_5m': return { sanction: 'timeout', timeoutMinutes: 5 };
    case 'mute_1h': return { sanction: 'timeout', timeoutMinutes: 60 };
    case 'timeout': return { sanction: 'timeout', timeoutMinutes: 10 };
    case 'none': case 'delete': case 'warn': case 'kick': case 'ban':
      return { sanction: raw, timeoutMinutes: null };
    default:
      return { sanction: 'delete', timeoutMinutes: null }; // valeur inconnue → la plus douce visible
  }
}

/** Label court d'une sanction normalisée (pour le hub). */
function sanctionLabel(raw) {
  const { sanction, timeoutMinutes } = normalizeSanction(raw);
  if (sanction === 'timeout') return `timeout ${timeoutMinutes}m`;
  return sanction;
}

// ─── Lecture unifiée ─────────────────────────────────────────────────────────

function _fortressModule(guildId, meta) {
  const cfg = storage.getConfig(guildId, meta.key);
  return {
    ...meta,
    enabled       : !!cfg?.enabled,
    sanctionRaw   : cfg?.action ?? 'delete',
    sanctionLabel : sanctionLabel(cfg?.action ?? 'delete'),
    threshold     : cfg?.threshold ?? 1,
    logsChannelId : null, // Forteresse : pas de canal par module (logs V3 globaux)
  };
}

function _antispamModule(guildId, meta) {
  const cfg = antispamHelper.getAntispamConfig(guildId);
  return {
    ...meta,
    enabled       : !!cfg?.enabled,
    sanctionRaw   : cfg?.flood_sanction ?? 'timeout',
    sanctionLabel : sanctionLabel(cfg?.flood_sanction ?? 'timeout'),
    threshold     : cfg?.flood_threshold ?? 5,
    logsChannelId : cfg?.logs_channel_id ?? null,
  };
}

function _antileakModule(guildId, meta) {
  const cfg = antileakHelper.getAntileakConfig(guildId);
  return {
    ...meta,
    enabled       : !!cfg?.enabled,
    sanctionRaw   : cfg?.sanction_discord_token ?? 'delete',
    sanctionLabel : sanctionLabel(cfg?.sanction_discord_token ?? 'delete'),
    threshold     : null,
    logsChannelId : cfg?.logs_channel_id ?? null,
  };
}

/**
 * Tous les modules avec leur état pour une guild — la source du hub.
 * @returns {Array<{key,label,cat,store,emoji,desc,enabled,sanctionRaw,sanctionLabel,threshold,logsChannelId}>}
 */
function listModules(guildId) {
  return MODULES.map(meta => {
    if (meta.store === 'antispam') return _antispamModule(guildId, meta);
    if (meta.store === 'antileak') return _antileakModule(guildId, meta);
    return _fortressModule(guildId, meta);
  });
}

function getModule(guildId, key) {
  const meta = MODULES_BY_KEY.get(key);
  if (!meta) return null;
  return listModules(guildId).find(m => m.key === key) ?? null;
}

// ─── Écriture unifiée ────────────────────────────────────────────────────────

/**
 * Active/désactive un module — crée la ligne DB si première activation.
 * @returns {boolean} nouvel état
 */
function setEnabled(guildId, key, enabled, updatedBy = null) {
  const meta = MODULES_BY_KEY.get(key);
  if (!meta) throw new Error(`Module sécurité inconnu : ${key}`);
  const on = enabled ? 1 : 0;
  if (meta.store === 'antispam') {
    antispamHelper.updateAntispamConfig(guildId, { enabled: on }, updatedBy);
  } else if (meta.store === 'antileak') {
    antileakHelper.updateAntileakConfig(guildId, { enabled: on }, updatedBy);
  } else {
    storage.setConfig(guildId, key, { enabled: on });
  }
  return !!on;
}

function toggleEnabled(guildId, key, updatedBy = null) {
  const mod = getModule(guildId, key);
  if (!mod) throw new Error(`Module sécurité inconnu : ${key}`);
  return setEnabled(guildId, key, !mod.enabled, updatedBy);
}

// ─── Réglages globaux (_settings dans security_config) ──────────────────────

const SETTINGS_KEY = '_settings';
const DEFAULT_SETTINGS = { exempt_moderators: 1 };

function getSettings(guildId) {
  const row = storage.getConfig(guildId, SETTINGS_KEY);
  if (!row?.custom_data) return { ...DEFAULT_SETTINGS };
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(row.custom_data) }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function setSettings(guildId, partial) {
  const merged = { ...getSettings(guildId), ...partial };
  storage.setConfig(guildId, SETTINGS_KEY, { custom_data: JSON.stringify(merged) });
  return merged;
}

// ─── Exemption unifiée ───────────────────────────────────────────────────────

/**
 * Règle d'exemption VAULT-ONLY (décision Nathan, SOC Phase 1) :
 *  · SEULE source de vérité : le vault (security_whitelist) —
 *    user / salon / rôle, par feature ou global.
 *  · Plus AUCUNE exemption implicite ManageMessages/Administrator.
 *  · Owner et bot restent protégés par les garde-fous d'apply-sanction
 *    (indépendants du vault).
 * Branché dans securityListener + enforcers V4 (Phase 1).
 * @param {import('discord.js').Message} message
 * @param {string} featureKey
 */
function isExempt(message, featureKey) {
  const member = message.member;
  if (!member) return false;

  const guildId = message.guild.id;
  if (storage.isWhitelisted(guildId, 'user', member.id, featureKey)) return true;
  if (message.channel?.id && storage.isWhitelisted(guildId, 'channel', message.channel.id, featureKey)) return true;
  const roleIds = member.roles?.cache ? [...member.roles.cache.keys()] : [];
  for (const rid of roleIds) {
    if (storage.isWhitelisted(guildId, 'role', rid, featureKey)) return true;
  }
  return false;
}

// ─── Stats agrégées (pour l'en-tête du hub) ──────────────────────────────────

function getOverview(guildId) {
  const modules = listModules(guildId);
  const stats = storage.getStats(guildId);
  return {
    modules,
    activeCount   : modules.filter(m => m.enabled).length,
    totalCount    : modules.length,
    totalTriggers : stats.reduce((s, r) => s + (r.trigger_count || 0), 0),
    whitelist     : storage.countWhitelist(guildId),
    settings      : getSettings(guildId),
  };
}

// ─── Pont ladder — LE point d'entrée sanction des enforcers ─────────────────

/**
 * Résout la sanction finale pour une détection (mode ladder ou fixe).
 * fallbackRaw = la sanction fixe configurée du module/sous-type — elle sert
 * de PLANCHER : le ladder ne peut jamais rendre plus faible (calibration).
 * @returns {{action, durationMs, count, mode}}
 */
function sanctionForTrigger(guildId, userId, key, fallbackRaw) {
  const { sanction: floor, timeoutMinutes } = normalizeSanction(fallbackRaw);
  return ladder.resolveSanction(guildId, userId, key, floor, timeoutMinutes ?? 10);
}

module.exports = {
  MODULES, MODULES_BY_KEY, UNIFIED_SANCTIONS,
  normalizeSanction, sanctionLabel,
  listModules, getModule,
  setEnabled, toggleEnabled,
  getSettings, setSettings,
  isExempt, getOverview,
  // Ladder
  sanctionForTrigger,
  getLadderConfig : ladder.getLadderConfig,
  setLadderConfig : ladder.setLadderConfig,
  setLadderMode   : ladder.setLadderMode,
  resetOffenses   : ladder.resetOffenses,
};
