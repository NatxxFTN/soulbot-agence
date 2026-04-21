'use strict';

const { db } = require('../database');

function getModConfig(guildId) {
  return db.prepare('SELECT * FROM mod_config WHERE guild_id = ?').get(guildId);
}

function ensureModConfig(guildId) {
  db.prepare('INSERT OR IGNORE INTO mod_config (guild_id) VALUES (?)').run(guildId);
}

function updateModConfig(guildId, updates, updatedBy = null) {
  ensureModConfig(guildId);
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const sets   = [...keys.map(k => `${k} = ?`), 'updated_at = ?', 'updated_by = ?'].join(', ');
  const values = [...keys.map(k => updates[k]), Date.now(), updatedBy, guildId];
  db.prepare(`UPDATE mod_config SET ${sets} WHERE guild_id = ?`).run(...values);
}

function resetModField(guildId, field, updatedBy = null) {
  updateModConfig(guildId, { [field]: null }, updatedBy);
}

module.exports = { getModConfig, updateModConfig, resetModField };
