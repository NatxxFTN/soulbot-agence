'use strict';

// Parseur de durée minimal pour les commandes 3-packs (lockdown, giveaway,
// slowmode, etc.).
//
// POURQUOI ne pas tout déléguer à `ms` (déjà installé) :
//   - `ms` accepte beaucoup de formats laxistes (« 5 minutes », « 1.5h »)
//     qui ne nous arrangent pas — on veut une grammaire stricte « <int><unit> ».
//   - On a besoin d'un formatDuration en français — `ms` formate en anglais.
// Compatibilité : ce module fournit la même API ergonomique que `ms` pour
// les cas simples : parseDuration('1h') → 3 600 000.

const UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Parse une chaîne « <entier><unit> » → millisecondes.
 * Unités supportées : s (sec), m (min), h (heure), d (jour), w (semaine).
 * @param {string} str
 * @returns {number|null}  ms si valide, null sinon
 */
function parseDuration(str) {
  if (typeof str !== 'string') return null;
  const match = str.trim().match(/^(\d+)\s*([smhdw])$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit  = match[2].toLowerCase();
  const mul   = UNITS[unit];
  if (!mul) return null;
  return value * mul;
}

/**
 * Formate une durée en ms vers un libellé français lisible.
 * Ex: 3_600_000 → '1 heure', 5_400_000 → '1 heure 30 minutes'.
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '0 seconde';
  if (ms === 0) return '0 seconde';

  const days  = Math.floor(ms / UNITS.d);
  const hours = Math.floor((ms % UNITS.d) / UNITS.h);
  const mins  = Math.floor((ms % UNITS.h) / UNITS.m);
  const secs  = Math.floor((ms % UNITS.m) / UNITS.s);

  const parts = [];
  if (days)  parts.push(`${days} jour${days  > 1 ? 's' : ''}`);
  if (hours) parts.push(`${hours} heure${hours > 1 ? 's' : ''}`);
  if (mins)  parts.push(`${mins} minute${mins  > 1 ? 's' : ''}`);
  if (secs && parts.length === 0) parts.push(`${secs} seconde${secs > 1 ? 's' : ''}`);

  return parts.length ? parts.join(' ') : '0 seconde';
}

module.exports = { parseDuration, formatDuration, UNITS };
