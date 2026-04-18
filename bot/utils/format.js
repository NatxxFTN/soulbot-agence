'use strict';

/**
 * Formate une durée en secondes en texte lisible
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Formate un nombre avec séparateur (ex: 1 234 567)
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
  if (!n && n !== 0) return '0';
  return Math.floor(n).toLocaleString('fr-FR');
}

/**
 * Formate un timestamp Unix en date locale
 * @param {number} ts - Unix timestamp (secondes)
 * @returns {string}
 */
function formatDate(ts) {
  if (!ts) return '*Jamais*';
  return new Date(ts * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

/**
 * Parse une durée textuelle ("30d", "2h", "15m", "60s") en secondes
 * @param {string} str
 * @returns {number|null}
 */
function parseTime(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(d|h|m|s)$/i);
  if (!match) return null;
  const units = { d: 86400, h: 3600, m: 60, s: 1 };
  return parseInt(match[1]) * units[match[2].toLowerCase()];
}

/**
 * Parse une durée textuelle en jours (entier)
 * @param {string} str  ex: "30d", "90"
 * @returns {number|null}
 */
function parseDays(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(d?)$/i);
  if (!match) return null;
  return parseInt(match[1]);
}

/**
 * Barre de progression ASCII
 * @param {number} current
 * @param {number} max
 * @param {number} length  Longueur de la barre
 * @returns {string}
 */
function progressBar(current, max, length = 12) {
  const ratio = Math.min(current / (max || 1), 1);
  const filled = Math.round(ratio * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

/**
 * Capitalise la première lettre d'une chaîne
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Tronque un texte à maxLen caractères
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen = 100) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/**
 * Formate une date JJ/MM en texte (ex: "14 février")
 * @param {number} day
 * @param {number} month
 * @returns {string}
 */
function formatBirthday(day, month) {
  const months = ['janvier','février','mars','avril','mai','juin',
                  'juillet','août','septembre','octobre','novembre','décembre'];
  return `${day} ${months[month - 1]}`;
}

module.exports = {
  formatDuration,
  formatNumber,
  formatDate,
  parseTime,
  parseDays,
  progressBar,
  capitalize,
  truncate,
  formatBirthday,
};
