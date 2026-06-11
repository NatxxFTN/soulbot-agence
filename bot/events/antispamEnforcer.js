'use strict';

// ═══════════════════════════════════════════════
// ANTISPAM ENFORCER — v2.1.2 (fix audit sécurité)
// AVANT CE FICHIER : ;antispam écrivait antispam_config mais AUCUN
// listener ne la lisait — le module était 100% décoratif.
// Enforce : flood, mention spam, messages répétés, caps.
// ═══════════════════════════════════════════════

const { PermissionFlagsBits } = require('discord.js');
const { getAntispamConfig, getWhitelistRoles } = require('../core/antispam-helper');
const { applySanction } = require('../core/apply-sanction');

// État en mémoire par guild:user — fenêtres glissantes
const floodMap  = new Map(); // key -> [timestamps]
const repeatMap = new Map(); // key -> { content, count }

// Purge périodique pour ne pas fuiter de la RAM sur les gros serveurs
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, stamps] of floodMap) {
    const kept = stamps.filter(t => t > cutoff);
    if (kept.length === 0) floodMap.delete(key); else floodMap.set(key, kept);
  }
  if (repeatMap.size > 10_000) repeatMap.clear();
}, 5 * 60_000).unref();

/**
 * Détection pure — exportée pour les tests (scripts/test-security.js).
 * @returns {?{type: string, sanction: string, reason: string}}
 */
function detect(message, config, state = { floodMap, repeatMap }) {
  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();

  // ── Flood : N messages en X secondes ───────────────────────────────────────
  const windowMs = (config.flood_window_seconds || 5) * 1000;
  const stamps = (state.floodMap.get(key) || []).filter(t => now - t < windowMs);
  stamps.push(now);
  state.floodMap.set(key, stamps);
  if (stamps.length >= (config.flood_threshold || 5)) {
    state.floodMap.delete(key); // reset pour ne pas re-trigger sur chaque message suivant
    return {
      type: 'flood', sanction: config.flood_sanction || 'timeout',
      reason: `Flood : ${stamps.length} messages en ${config.flood_window_seconds}s`,
    };
  }

  // ── Mention spam ───────────────────────────────────────────────────────────
  const mentionCount = (message.mentions?.users?.size || 0) + (message.mentions?.roles?.size || 0);
  if (mentionCount >= (config.mentions_threshold || 5)) {
    return {
      type: 'mentions', sanction: config.mentions_sanction || 'timeout',
      reason: `Mention spam : ${mentionCount} mentions`,
    };
  }

  // ── Messages répétés ───────────────────────────────────────────────────────
  const content = (message.content || '').trim();
  if (content.length >= 3) {
    const prev = state.repeatMap.get(key);
    if (prev && prev.content === content) {
      prev.count += 1;
      if (prev.count >= (config.repeat_threshold || 3)) {
        state.repeatMap.delete(key);
        return {
          type: 'repeat', sanction: config.repeat_sanction || 'delete',
          reason: `Message répété ${prev.count} fois`,
        };
      }
    } else {
      state.repeatMap.set(key, { content, count: 1 });
    }
  }

  // ── Caps ───────────────────────────────────────────────────────────────────
  if (config.caps_enabled && content.length >= (config.caps_min_length || 10)) {
    const letters = content.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (letters.length >= (config.caps_min_length || 10)) {
      const upperRatio = (letters.replace(/[^A-ZÀ-Ý]/g, '').length / letters.length) * 100;
      if (upperRatio >= (config.caps_threshold || 70)) {
        return {
          type: 'caps', sanction: config.caps_sanction || 'delete',
          reason: `Abus de majuscules (${Math.round(upperRatio)}%)`,
        };
      }
    }
  }

  return null;
}

module.exports = {
  name: 'messageCreate',
  once: false,
  detect, // exposé pour les tests

  async execute(message, _client) {
    if (!message.guild || message.author?.bot || message.system) return;

    const config = getAntispamConfig(message.guild.id);
    if (!config?.enabled) return;

    // Modérateurs et rôles whitelistés exemptés
    if (message.member?.permissions?.has(PermissionFlagsBits.ManageMessages)) return;
    const wlRoles = getWhitelistRoles(message.guild.id);
    if (wlRoles.length && message.member?.roles.cache.some(r => wlRoles.includes(r.id))) return;

    const hit = detect(message, config);
    if (!hit || hit.sanction === 'none') return;

    await applySanction(message, 'antispam', hit.sanction, hit.reason, config.logs_channel_id);
  },
};
