'use strict';

const fs   = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../../data/emojis-ids.json');

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveCache(cache) {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function setEmojiId(name, id, animated = false, guildId = null) {
  const cache = loadCache();
  const entry = { id, animated, updated_at: Date.now() };
  if (guildId) entry.guildId = guildId;
  cache[name] = entry;
  saveCache(cache);
}

function getEmojiId(name) {
  return loadCache()[name] || null;
}

// ─── Garde anti-COMPONENT_INVALID_EMOJI ──────────────────────────────────────
// Un emoji custom n'est utilisable QUE si le bot est membre du serveur qui
// l'héberge. Sinon Discord rejette le composant entier (erreur 50035).
// La liste des serveurs accessibles est injectée au démarrage (ready.js).
let _accessibleGuilds = null; // null = inconnu (avant ready) → on n'écarte rien

function setAccessibleGuilds(guildIds) {
  _accessibleGuilds = new Set(guildIds);
}

/**
 * @param {{id?: string, guildId?: string}} entry - entrée du cache
 * @returns {boolean} false si l'emoji vit sur un serveur où le bot n'est pas
 */
function isEmojiUsable(entry) {
  if (!entry || !entry.id) return false;
  if (!_accessibleGuilds) return true;     // avant ready : on suppose accessible
  if (!entry.guildId) return true;          // entrée legacy sans guildId : idem
  return _accessibleGuilds.has(entry.guildId);
}

/**
 * Retourne la string Discord utilisable dans un embed/message.
 * Fallback sur `fallback` (Unicode) si l'emoji n'est pas en cache.
 * @param {string} name     — clé ex: 'ui_check'
 * @param {string} fallback — Unicode de secours ex: '✅'
 */
function getEmoji(name, fallback = '') {
  const entry = getEmojiId(name);
  if (!isEmojiUsable(entry)) return fallback; // absent OU serveur inaccessible
  return entry.animated ? `<a:${name}:${entry.id}>` : `<:${name}:${entry.id}>`;
}

function listAll() { return loadCache(); }

function clearCache() {
  if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
}

module.exports = {
  loadCache, saveCache, setEmojiId, getEmojiId, getEmoji, listAll, clearCache,
  setAccessibleGuilds, isEmojiUsable,
};
