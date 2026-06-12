'use strict';

// ═══════════════════════════════════════════════
// SOC STATE — Defense Grid 2A
// Prépare l'objet state consommé par le renderer image et la console.
// AUCUN rendu ici, AUCUN fetch dans le renderer : séparation stricte.
// state = { opName, theme, posture, score, defcon, modules[],
//           incidents24h[24], blockedTotal, lastIncidentAt, generatedAt }
// ═══════════════════════════════════════════════

const { db } = require('../database');
const registry = require('./security-registry');
const storage = require('./security-storage');
const { SOC_POSTURE } = require('../ui/theme');

// Pondération du Security Score (total = 100). Un module critique désarmé
// coûte plus cher qu'un module mineur. Breakdown actionnable : Phase 4.
const SCORE_WEIGHTS = {
  antinuke: 15, antiraid: 12, antispam: 12, antileak: 10,
  antiinvite: 8, antilink: 8, antibot: 6, antieveryone: 5, antinsfw: 5,
  antimention: 4, antinewaccount: 4, antiwords: 4, antiduplicate: 3,
  anticaps: 2, antiemojispam: 2,
};

const DEFCON_LEVELS = ['PASSIF', 'STANDARD', 'ÉLEVÉ', 'HAUT', 'LOCKDOWN'];

const STMT_LOGS_24H = db.prepare(`
  SELECT triggered_at FROM security_logs
  WHERE guild_id = ? AND triggered_at > ?
  ORDER BY triggered_at DESC
`);

function computeScore(modules) {
  let score = 0;
  for (const m of modules) {
    if (m.enabled) score += SCORE_WEIGHTS[m.key] ?? 0;
  }
  return Math.min(100, score);
}

/**
 * Posture : BREACH si incident < 10 min · ELEVATED si incident < 60 min
 * ou couverture faible (< 50) · SECURE sinon.
 */
function computePosture(score, lastIncidentAt, now = Date.now()) {
  if (lastIncidentAt && now - lastIncidentAt < 10 * 60_000) return 'BREACH';
  if ((lastIncidentAt && now - lastIncidentAt < 60 * 60_000) || score < 50) return 'ELEVATED';
  return 'SECURE';
}

/**
 * Construit le state complet du SOC pour une guild.
 * @param {{id: string, name?: string}} guild
 */
function buildSocState(guild, now = Date.now()) {
  const ov = registry.getOverview(guild.id);
  const settings = registry.getSettings(guild.id);

  // Incidents 24 h → 24 buckets horaires (le plus ancien en premier)
  const since = now - 24 * 3_600_000;
  const stamps = STMT_LOGS_24H.all(guild.id, since).map(r => r.triggered_at);
  const incidents24h = new Array(24).fill(0);
  for (const t of stamps) {
    const bucket = 23 - Math.min(23, Math.floor((now - t) / 3_600_000));
    incidents24h[bucket]++;
  }
  const lastIncidentAt = stamps.length ? stamps[0] : null;

  const score = computeScore(ov.modules);
  const posture = computePosture(score, lastIncidentAt, now);

  return {
    opName        : settings.op_name ?? 'SOULBOT DEFENSE GRID',
    themeKey      : settings.soc_theme ?? 'red_alert',
    posture,
    postureColor  : SOC_POSTURE[posture].accent,
    score,
    defcon        : Math.min(5, Math.max(1, settings.defcon ?? 2)), // 1=PASSIF … 5=LOCKDOWN
    defconLabel   : DEFCON_LEVELS[(Math.min(5, Math.max(1, settings.defcon ?? 2))) - 1],
    modules       : ov.modules.map(m => ({ key: m.key, label: m.label, enabled: m.enabled })),
    incidents24h,
    blockedTotal  : ov.totalTriggers,
    activeCount   : ov.activeCount,
    totalCount    : ov.totalCount,
    lastIncidentAt,
    generatedAt   : now,
  };
}

module.exports = { buildSocState, computeScore, computePosture, SCORE_WEIGHTS, DEFCON_LEVELS };
