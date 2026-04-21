'use strict';

const { db } = require('../database');

function getWarnConfig(guildId) {
  return db.prepare('SELECT * FROM warn_config WHERE guild_id = ?').get(guildId);
}

function ensureWarnConfig(guildId) {
  db.prepare('INSERT OR IGNORE INTO warn_config (guild_id) VALUES (?)').run(guildId);
}

function updateWarnConfig(guildId, updates, updatedBy = null) {
  ensureWarnConfig(guildId);
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const sets   = [...keys.map(k => `${k} = ?`), 'updated_at = ?', 'updated_by = ?'].join(', ');
  const values = [...keys.map(k => updates[k]), Date.now(), updatedBy, guildId];
  db.prepare(`UPDATE warn_config SET ${sets} WHERE guild_id = ?`).run(...values);
}

function getThresholds(guildId) {
  const cfg = getWarnConfig(guildId);
  if (!cfg?.thresholds) return [];
  try { return JSON.parse(cfg.thresholds); } catch { return []; }
}

function setThresholds(guildId, thresholds, updatedBy = null) {
  updateWarnConfig(guildId, { thresholds: JSON.stringify(thresholds) }, updatedBy);
}

function addThreshold(guildId, count, action, duration, updatedBy = null) {
  const list = getThresholds(guildId);
  // Remplace si le count existe déjà
  const idx = list.findIndex(t => t.count === count);
  const entry = { count, action, duration: duration || null };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  list.sort((a, b) => a.count - b.count);
  setThresholds(guildId, list, updatedBy);
}

function removeThreshold(guildId, index, updatedBy = null) {
  const list = getThresholds(guildId);
  if (index >= 0 && index < list.length) list.splice(index, 1);
  setThresholds(guildId, list, updatedBy);
}

module.exports = {
  getWarnConfig,
  updateWarnConfig,
  getThresholds,
  setThresholds,
  addThreshold,
  removeThreshold,
};
