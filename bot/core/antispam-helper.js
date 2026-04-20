'use strict';

const { db } = require('../database');

const VALID_SANCTIONS = ['none', 'delete', 'warn', 'timeout', 'kick', 'ban'];

function getAntispamConfig(guildId) {
  return db.prepare('SELECT * FROM antispam_config WHERE guild_id = ?').get(guildId);
}

function updateAntispamConfig(guildId, updates, updatedBy = null) {
  if (!getAntispamConfig(guildId)) {
    db.prepare('INSERT OR IGNORE INTO antispam_config (guild_id) VALUES (?)').run(guildId);
  }
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const sets   = [...keys.map(k => `${k} = ?`), 'updated_at = ?', 'updated_by = ?'].join(', ');
  const values = [...keys.map(k => updates[k]), Date.now(), updatedBy, guildId];
  db.prepare(`UPDATE antispam_config SET ${sets} WHERE guild_id = ?`).run(...values);
}

function getWhitelistRoles(guildId) {
  return db.prepare('SELECT role_id FROM antispam_whitelist WHERE guild_id = ?').all(guildId).map(r => r.role_id);
}

function addWhitelistRole(guildId, roleId, addedBy) {
  db.prepare('INSERT OR IGNORE INTO antispam_whitelist (guild_id, role_id, added_by) VALUES (?, ?, ?)').run(guildId, roleId, addedBy);
}

function removeWhitelistRole(guildId, roleId) {
  db.prepare('DELETE FROM antispam_whitelist WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
}

module.exports = {
  getAntispamConfig,
  updateAntispamConfig,
  getWhitelistRoles,
  addWhitelistRole,
  removeWhitelistRole,
  VALID_SANCTIONS,
};
