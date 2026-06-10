'use strict';

// ═══════════════════════════════════════════════
// PRICING CENTRALISÉ — v2.1.2
// Source de vérité unique des tiers/prix (table bot_pricing).
// Toute commande qui affiche un prix passe par ici — zéro hardcode.
// Cache mémoire 5 min : invalidé à chaque écriture pour que
// les panels reflètent un changement de prix immédiatement.
// ═══════════════════════════════════════════════

const { db } = require('../database');
const logger = require('../utils/logger');

const _all    = db.prepare('SELECT * FROM bot_pricing WHERE is_active = 1 ORDER BY price_usd ASC');
const _byId   = db.prepare('SELECT * FROM bot_pricing WHERE id = ?');
const _update = db.prepare(`
  UPDATE bot_pricing
  SET price_usd = ?, price_discord = ?, description = ?, features = ?,
      updated_at = unixepoch(), updated_by = ?
  WHERE id = ?
`);

// ─── Cache stratégique (Section 5.2) ─────────────────────────────────────────
let PRICING_CACHE = null;
const CACHE_TTL = 300_000; // 5 min

function invalidatePricingCache() {
  PRICING_CACHE = null;
}

/**
 * Tous les tiers actifs, triés par prix croissant. Lecture cachée 5 min.
 * @returns {Array<{id, name, price_usd, price_discord, description, features, is_active}>}
 */
function getAllPricing() {
  if (PRICING_CACHE && (Date.now() - PRICING_CACHE.timestamp < CACHE_TTL)) {
    return PRICING_CACHE.data;
  }
  PRICING_CACHE = { data: _all.all(), timestamp: Date.now() };
  return PRICING_CACHE.data;
}

/**
 * Un tier par son id ('fixed' | 'tier_basic' | 'tier_pro' | 'tier_premium').
 */
function getPricingById(id) {
  return _byId.get(id) ?? null;
}

/**
 * Met à jour un tier. Les champs omis gardent leur valeur actuelle.
 * Invalide le cache — le prochain affichage lit la DB.
 * @returns {boolean} true si le tier existait
 */
function updatePricing(id, { price_usd, price_discord, description, features, updated_by } = {}) {
  const cur = getPricingById(id);
  if (!cur) return false;
  _update.run(
    price_usd     ?? cur.price_usd,
    price_discord ?? cur.price_discord,
    description   ?? cur.description,
    features      ?? cur.features,
    updated_by    ?? cur.updated_by,
    id,
  );
  invalidatePricingCache();
  return true;
}

/**
 * Features d'un tier (JSON array stocké en TEXT — tolérant aux données cassées).
 * @returns {string[]}
 */
function getFeaturesByTier(tierId) {
  const tier = getPricingById(tierId);
  if (!tier?.features) return [];
  try {
    const parsed = JSON.parse(tier.features);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * À appeler après chaque modification de prix (Section 3.1).
 * Invalide les caches et poste un log dans PRICE_LOG_CHANNEL si configuré.
 * Les panels lisent la DB en temps réel : pas d'autre push nécessaire.
 * @param {string} pricingId
 * @param {import('discord.js').Client} client
 */
async function syncPricingAcrossBot(pricingId, client) {
  invalidatePricingCache();
  client.pricingCache = null;

  const channelId = process.env.PRICE_LOG_CHANNEL;
  if (!channelId) return;
  try {
    const channel = client.channels.cache.get(channelId)
      ?? await client.channels.fetch(channelId);
    const tier = getPricingById(pricingId);
    if (channel && tier) {
      const { infoEmbed } = require('../utils/response-builder');
      await channel.send({
        embeds: [infoEmbed('Prix mis à jour', `**${tier.name}** : $${tier.price_usd.toFixed(2)}`)],
      });
    }
  } catch (err) {
    logger.warn('Pricing', `Log de prix impossible : ${err.message}`);
  }
}

module.exports = {
  getAllPricing,
  getPricingById,
  updatePricing,
  getFeaturesByTier,
  invalidatePricingCache,
  syncPricingAcrossBot,
};
