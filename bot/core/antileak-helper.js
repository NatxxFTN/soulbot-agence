'use strict';

const { db } = require('../database');

const VALID_SANCTIONS = ['none', 'delete', 'warn', 'timeout', 'kick', 'ban'];

function getAntileakConfig(guildId) {
  return db.prepare('SELECT * FROM antileak_config WHERE guild_id = ?').get(guildId);
}

function updateAntileakConfig(guildId, updates, updatedBy = null) {
  if (!getAntileakConfig(guildId)) {
    db.prepare('INSERT OR IGNORE INTO antileak_config (guild_id) VALUES (?)').run(guildId);
  }
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const sets   = [...keys.map(k => `${k} = ?`), 'updated_at = ?', 'updated_by = ?'].join(', ');
  const values = [...keys.map(k => updates[k]), Date.now(), updatedBy, guildId];
  db.prepare(`UPDATE antileak_config SET ${sets} WHERE guild_id = ?`).run(...values);
}

function getWhitelistRoles(guildId) {
  return db.prepare('SELECT role_id FROM antileak_whitelist WHERE guild_id = ?').all(guildId).map(r => r.role_id);
}

function addWhitelistRole(guildId, roleId, addedBy) {
  db.prepare('INSERT OR IGNORE INTO antileak_whitelist (guild_id, role_id, added_by) VALUES (?, ?, ?)').run(guildId, roleId, addedBy);
}

function removeWhitelistRole(guildId, roleId) {
  db.prepare('DELETE FROM antileak_whitelist WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
}

module.exports = {
  getAntileakConfig,
  updateAntileakConfig,
  getWhitelistRoles,
  addWhitelistRole,
  removeWhitelistRole,
  VALID_SANCTIONS,
};
