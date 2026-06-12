'use strict';

// ── Security Listener — dispatcher central des features anti-* ───────────────
// Un SEUL event messageCreate qui :
//   1. Short-circuit sur bots, DMs, messages système
//   2. Check blacklist (suppression immédiate)
//   3. Récupère les features actives pour la guild
//   4. Whitelist check (user, rôle, salon) par feature
//   5. Charge à la demande `bot/core/security-detectors/<feature>.js`
//   6. Applique applyPunishment(action, ...) si triggered
// Les détecteurs eux-mêmes sont créés par les prompts 2/3 du Pack Forteresse.

const storage = require('../core/security-storage');
const registry = require('../core/security-registry');
const { applySanction } = require('../core/apply-sanction');

// Cache des modules détecteurs (évite N require par message)
const detectorCache = new Map();
const MISSING = Symbol('missing-detector');

function loadDetector(feature) {
  if (detectorCache.has(feature)) {
    const cached = detectorCache.get(feature);
    return cached === MISSING ? null : cached;
  }
  try {
    const mod = require(`../core/security-detectors/${feature}`);
    if (mod && typeof mod.check === 'function') {
      detectorCache.set(feature, mod);
      return mod;
    }
    detectorCache.set(feature, MISSING);
    return null;
  } catch {
    detectorCache.set(feature, MISSING);
    return null;
  }
}

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, _client) {
    // ── Court-circuit ──────────────────────────────────────────────────────
    if (!message.guild) return;
    if (message.author?.bot) return;
    if (message.system) return;

    const guildId = message.guild.id;
    const userId  = message.author.id;

    // ── Blacklist : suppression immédiate ──────────────────────────────────
    if (storage.isBlacklisted(guildId, userId)) {
      await message.delete().catch(() => {});
      return;
    }

    // ── Features actives ───────────────────────────────────────────────────
    const allFeatures = storage.getAllFeatures(guildId);
    const active = allFeatures.filter(f => f.enabled);
    if (active.length === 0) return;

    // ── Dispatch — exemption VAULT-ONLY + ladder (SOC Phase 1) ────────────
    for (const config of active) {
      if (config.feature.startsWith('_')) continue; // lignes techniques (_settings)
      if (registry.isExempt(message, config.feature)) continue;

      const detector = loadDetector(config.feature);
      if (!detector) continue; // détecteur pas encore implémenté

      try {
        const result = await detector.check(message, config);
        if (result?.triggered) {
          // Sanction résolue par le ladder, plancher = config.action du module.
          const res = registry.sanctionForTrigger(guildId, userId, config.feature, config.action);
          await applySanction(
            message, config.feature, res.action,
            result.reason || 'Règle déclenchée', null,
            { durationMs: res.durationMs, offenseCount: res.count },
          );
          // Une seule punition par message — on arrête
          return;
        }
      } catch (err) {
        console.error(`[security-listener] ${config.feature}:`, err.message);
      }
    }
  },
};
