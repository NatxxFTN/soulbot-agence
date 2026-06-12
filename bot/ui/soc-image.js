'use strict';

// ═══════════════════════════════════════════════
// SOC IMAGE — orchestration dashboard (Defense Grid 2A)
// state-builder (core) → renderer (pur) → cache 5 s par guild →
// payload Discord complet (container CV2 + attachment).
// FALLBACK GARANTI : canvas indisponible ou rendu null → hub pur-CV2
// identique à la V5 validée, jamais de crash.
// ═══════════════════════════════════════════════

const { AttachmentBuilder, MessageFlags } = require('discord.js');
const { buildSocState } = require('../core/soc-state');
const { renderDashboard, isCanvasAvailable } = require('./renderers/soc-dashboard-renderer');
const { renderHub } = require('./panels/security-studio');

const CACHE_TTL_MS = 5_000;
const _cache = new Map(); // guildId → { buffer, ts }

/**
 * Buffer PNG du dashboard, avec cache court (anti re-render en boucle).
 * @param {object} [state] - SocState pré-calculé (évite un double build)
 * @returns {?Buffer}
 */
function getDashboardBuffer(guild, { force = false, state = null } = {}) {
  if (!isCanvasAvailable()) return null;

  const hit = _cache.get(guild.id);
  if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.buffer;

  const buffer = renderDashboard(state ?? buildSocState(guild)); // null si échec → fallback
  if (buffer) _cache.set(guild.id, { buffer, ts: Date.now() });
  return buffer;
}

/**
 * Payload complet du hub SOC : image + contrôles CV2, ou fallback pur-CV2.
 * Utilisé par la commande ;security ET le handler (source unique).
 * Le state est construit UNE fois et partagé image/panel (posture cohérente).
 * files:[] explicite en fallback → purge l'attachment d'un hub précédent.
 */
function buildHubPayload(guild, { forceImage = false } = {}) {
  const state = buildSocState(guild);
  const buffer = getDashboardBuffer(guild, { force: forceImage, state });

  if (!buffer) {
    return {
      components: [renderHub(guild, { state })],
      files     : [],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    };
  }

  return {
    components: [renderHub(guild, { withImage: true, state })],
    files     : [new AttachmentBuilder(buffer, { name: 'soc.png' })],
    flags     : MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };
}

function invalidateCache(guildId) { _cache.delete(guildId); }

module.exports = { buildHubPayload, getDashboardBuffer, invalidateCache, CACHE_TTL_MS };
