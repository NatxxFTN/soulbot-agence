'use strict';

// API helper — appels HTTP partagés par les commandes utility-pro & co.
// POURQUOI ce module : centraliser cache LRU + rate limit par hostname +
// timeout AbortController. Les commandes peuvent garder leur propre fetch
// quand elles n'ont pas besoin de mutualisation (ex: weather utilise une
// clé API perso et bénéficie peu d'un cache LRU). Mais quand plusieurs
// commandes tapent la même API publique, ce helper évite de répéter la
// plomberie et protège contre le throttling externe.
//
// Node ≥ 18 fournit fetch / AbortSignal nativement. Pas de dépendance npm.

const TTL_MS               = 60 * 60 * 1000;  // 1 h
const CACHE_MAX            = 100;
const RATE_WINDOW_MS       = 60 * 1000;
const RATE_MAX_PER_WINDOW  = 30;
const DEFAULT_TIMEOUT_MS   = 10_000;

// LRU naïf basé sur l'ordre d'insertion d'une Map.
const cache      = new Map();
const rateLimits = new Map(); // hostname → { windowStart, count }

function lruSet(key, value) {
  if (cache.has(key)) cache.delete(key); // refresh ordre
  cache.set(key, value);
  if (cache.size > CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function lruGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  // refresh ordre LRU
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function checkAndIncrement(hostname) {
  const now = Date.now();
  const slot = rateLimits.get(hostname);
  if (!slot || now - slot.windowStart > RATE_WINDOW_MS) {
    rateLimits.set(hostname, { windowStart: now, count: 1 });
    return true;
  }
  if (slot.count >= RATE_MAX_PER_WINDOW) return false;
  slot.count++;
  return true;
}

function hostnameOf(url) {
  try { return new URL(url).hostname; }
  catch { return 'invalid'; }
}

/**
 * GET HTTP avec cache LRU (texte), rate-limit par hostname, timeout AbortController.
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeout]   timeout en ms (défaut 10 s)
 * @param {object} [options.headers]   headers HTTP
 * @param {boolean} [options.useCache] activer le cache (défaut true)
 * @returns {Promise<string>}          corps de la réponse en texte
 */
async function httpGet(url, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, headers = {}, useCache = true } = options;

  if (useCache) {
    const hit = lruGet(url);
    if (hit) return hit.data;
  }

  const hostname = hostnameOf(url);
  if (!checkAndIncrement(hostname)) {
    throw new Error(`Rate limit dépassé pour ${hostname} (max ${RATE_MAX_PER_WINDOW}/min).`);
  }

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${hostname}`);
    const data = await res.text();
    if (useCache) lruSet(url, { data, at: Date.now() });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST HTTP avec timeout, sans cache (un POST ne se cache pas).
 * @param {string} url
 * @param {object|string} body  objet → JSON.stringify, sinon envoyé tel quel
 * @param {object} [options]
 * @param {number} [options.timeout]
 * @param {object} [options.headers]
 * @returns {Promise<string>}   corps de la réponse en texte
 */
async function httpPost(url, body, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, headers = {} } = options;

  const hostname = hostnameOf(url);
  if (!checkAndIncrement(hostname)) {
    throw new Error(`Rate limit dépassé pour ${hostname} (max ${RATE_MAX_PER_WINDOW}/min).`);
  }

  const isJson = body !== null && typeof body === 'object';
  const payload = isJson ? JSON.stringify(body) : body;
  const finalHeaders = isJson
    ? { 'Content-Type': 'application/json', ...headers }
    : headers;

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { method: 'POST', headers: finalHeaders, body: payload, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${hostname}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Vide le cache (utile pour tests / debug). */
function clearCache() { cache.clear(); }

/** Snapshot diagnostique. */
function stats() {
  return {
    cacheSize : cache.size,
    cacheMax  : CACHE_MAX,
    ttlMs     : TTL_MS,
    rateHosts : rateLimits.size,
  };
}

module.exports = { httpGet, httpPost, clearCache, stats };
