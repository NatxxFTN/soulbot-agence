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

function setEmojiId(name, id, animated = false) {
  const cache = loadCache();
  cache[name] = { id, animated, updated_at: Date.now() };
  saveCache(cache);
}

function getEmojiId(name) {
  return loadCache()[name] || null;
}

/**
 * Retourne la string Discord utilisable dans un embed/message.
 * Fallback sur `fallback` (Unicode) si l'emoji n'est pas en cache.
 * @param {string} name     — clé ex: 'ui_check'
 * @param {string} fallback — Unicode de secours ex: '✅'
 */
function getEmoji(name, fallback = '') {
  const entry = getEmojiId(name);
  if (!entry) return fallback;
  return entry.animated ? `<a:${name}:${entry.id}>` : `<:${name}:${entry.id}>`;
}

function listAll() { return loadCache(); }

function clearCache() {
  if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
}

module.exports = { loadCache, saveCache, setEmojiId, getEmojiId, getEmoji, listAll, clearCache };
