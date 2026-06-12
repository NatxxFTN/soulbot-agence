'use strict';

// ═══════════════════════════════════════════════
// SECURITY LADDER — moteur d'échelle de sanction (SOC Phase 1)
// · security_ladder   : config par (guild, module) — mode, fenêtre, paliers
// · security_offenses : tracker de récidives par (guild, user, module)
// Règle de calibration (décision Nathan) : le résultat du ladder n'est
// JAMAIS plus faible que la sanction fixe configurée du module — on
// clampe vers le haut via la sévérité. Un système de sécu ne
// s'adoucit pas en silence.
// Tables dédiées : custom_data de security_config est déjà utilisé
// par antiraid (window) et antiwords (liste) — pas de collision.
// ═══════════════════════════════════════════════

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS security_ladder (
    guild_id       TEXT    NOT NULL,
    module         TEXT    NOT NULL,
    mode           TEXT    NOT NULL DEFAULT 'ladder',   -- 'ladder' | 'fixed'
    window_seconds INTEGER NOT NULL DEFAULT 600,
    ladder_json    TEXT,                                -- null → ladder par défaut calibré
    updated_at     INTEGER,
    updated_by     TEXT,
    PRIMARY KEY (guild_id, module)
  );

  CREATE TABLE IF NOT EXISTS security_offenses (
    guild_id        TEXT    NOT NULL,
    user_id         TEXT    NOT NULL,
    module          TEXT    NOT NULL,
    count           INTEGER NOT NULL DEFAULT 0,
    last_offense_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id, module)
  );
  CREATE INDEX IF NOT EXISTS idx_sec_offenses_guild ON security_offenses(guild_id);
`);

// ─── Sévérité (échelle canonique V5) ─────────────────────────────────────────

const SEVERITY = { none: 0, delete: 1, warn: 2, timeout: 3, kick: 4, ban: 5 };

/** La plus forte des deux actions (clamp de calibration). */
function strongerAction(a, b) {
  return (SEVERITY[a] ?? 0) >= (SEVERITY[b] ?? 0) ? a : b;
}

// ─── Ladders par défaut, calibrés sur la sanction fixe (le « plancher ») ────
// Premier palier = la sanction fixe du module, puis escalade au-delà.

function defaultLadderFor(floorSanction, floorTimeoutMinutes = 10) {
  switch (floorSanction) {
    case 'ban':     return [{ count: 1, action: 'ban' }];
    case 'kick':    return [{ count: 1, action: 'kick' }, { count: 4, action: 'ban' }];
    case 'timeout': return [
      { count: 1, action: 'timeout', duration: floorTimeoutMinutes * 60 },
      { count: 4, action: 'timeout', duration: 3600 },
      { count: 6, action: 'kick' },
      { count: 9, action: 'ban' },
    ];
    case 'warn':    return [
      { count: 1, action: 'warn' },
      { count: 4, action: 'timeout', duration: 600 },
      { count: 7, action: 'kick' },
      { count: 10, action: 'ban' },
    ];
    case 'none':    return [{ count: 1, action: 'none' }];
    case 'delete':
    default:        return [
      { count: 1, action: 'delete' },
      { count: 3, action: 'warn' },
      { count: 5, action: 'timeout', duration: 600 },
      { count: 8, action: 'kick' },
      { count: 12, action: 'ban' },
    ];
  }
}

// ─── Config ladder ───────────────────────────────────────────────────────────

const STMT_LADDER_GET = db.prepare('SELECT * FROM security_ladder WHERE guild_id = ? AND module = ?');
const STMT_LADDER_UPSERT = db.prepare(`
  INSERT INTO security_ladder (guild_id, module, mode, window_seconds, ladder_json, updated_at, updated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(guild_id, module) DO UPDATE SET
    mode = excluded.mode, window_seconds = excluded.window_seconds,
    ladder_json = excluded.ladder_json, updated_at = excluded.updated_at,
    updated_by = excluded.updated_by
`);

/**
 * Config ladder effective d'un module (défauts calibrés si jamais configuré).
 * @param {string} floorSanction - sanction fixe normalisée du module (le plancher)
 */
function getLadderConfig(guildId, module, floorSanction = 'delete', floorTimeoutMinutes = 10) {
  const row = STMT_LADDER_GET.get(guildId, module);
  let ladder = null;
  if (row?.ladder_json) {
    try { ladder = JSON.parse(row.ladder_json); } catch { ladder = null; }
  }
  return {
    mode          : row?.mode ?? 'ladder',
    windowSeconds : row?.window_seconds ?? 600,
    ladder        : Array.isArray(ladder) && ladder.length
      ? ladder
      : defaultLadderFor(floorSanction, floorTimeoutMinutes),
    isDefault     : !row?.ladder_json,
  };
}

function setLadderConfig(guildId, module, { mode, windowSeconds, ladder }, updatedBy = null) {
  const current = getLadderConfig(guildId, module);
  STMT_LADDER_UPSERT.run(
    guildId, module,
    mode ?? current.mode,
    windowSeconds ?? current.windowSeconds,
    ladder ? JSON.stringify(ladder) : (current.isDefault ? null : JSON.stringify(current.ladder)),
    Date.now(), updatedBy,
  );
}

function setLadderMode(guildId, module, mode, updatedBy = null) {
  if (mode !== 'ladder' && mode !== 'fixed') throw new Error(`Mode ladder invalide : ${mode}`);
  setLadderConfig(guildId, module, { mode }, updatedBy);
  return mode;
}

// ─── Tracker de récidives ────────────────────────────────────────────────────

const STMT_OFF_GET = db.prepare('SELECT * FROM security_offenses WHERE guild_id = ? AND user_id = ? AND module = ?');
const STMT_OFF_UPSERT = db.prepare(`
  INSERT INTO security_offenses (guild_id, user_id, module, count, last_offense_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(guild_id, user_id, module) DO UPDATE SET
    count = excluded.count, last_offense_at = excluded.last_offense_at
`);
const STMT_OFF_RESET = db.prepare('DELETE FROM security_offenses WHERE guild_id = ? AND user_id = ? AND module = ?');

/**
 * Enregistre une infraction et retourne le compte courant.
 * Si la dernière infraction date de plus de windowSeconds → le compte repart à 1.
 * @param {number} [now] - injectable pour les tests
 */
function recordOffense(guildId, userId, module, windowSeconds = 600, now = Date.now()) {
  const row = STMT_OFF_GET.get(guildId, userId, module);
  const count = (row && now - row.last_offense_at <= windowSeconds * 1000)
    ? row.count + 1
    : 1;
  STMT_OFF_UPSERT.run(guildId, userId, module, count, now);
  return count;
}

function resetOffenses(guildId, userId, module) {
  STMT_OFF_RESET.run(guildId, userId, module);
}

// ─── Résolution ──────────────────────────────────────────────────────────────

/** Palier atteint pour un compte d'infractions donné. */
function resolveRung(ladder, count) {
  let rung = ladder[0] ?? { count: 1, action: 'delete' };
  for (const r of ladder) {
    if (count >= r.count) rung = r;
  }
  return rung;
}

/**
 * Sanction finale pour une détection — LE point d'entrée des enforcers.
 * Applique le clamp de calibration : jamais plus faible que floorSanction.
 * @returns {{action: string, durationMs: ?number, count: number, mode: string}}
 */
function resolveSanction(guildId, userId, module, floorSanction, floorTimeoutMinutes = 10, now = Date.now()) {
  const cfg = getLadderConfig(guildId, module, floorSanction, floorTimeoutMinutes);

  if (cfg.mode === 'fixed') {
    return {
      action    : floorSanction,
      durationMs: floorSanction === 'timeout' ? floorTimeoutMinutes * 60_000 : null,
      count     : 0,
      mode      : 'fixed',
    };
  }

  const count = recordOffense(guildId, userId, module, cfg.windowSeconds, now);
  const rung  = resolveRung(cfg.ladder, count);

  // Clamp calibration : le ladder ne peut pas adoucir la sanction fixe.
  const action = strongerAction(rung.action, floorSanction);

  let durationMs = null;
  if (action === 'timeout') {
    durationMs = (rung.action === 'timeout' && rung.duration)
      ? rung.duration * 1000
      : floorTimeoutMinutes * 60_000;
  }

  return { action, durationMs, count, mode: 'ladder' };
}

module.exports = {
  SEVERITY, strongerAction, defaultLadderFor,
  getLadderConfig, setLadderConfig, setLadderMode,
  recordOffense, resetOffenses,
  resolveRung, resolveSanction,
};
