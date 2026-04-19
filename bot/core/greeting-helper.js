'use strict';

const { db } = require('../database');

const STMT_GET = db.prepare('SELECT * FROM greeting_config WHERE guild_id = ?');

function getConfig(guildId) {
  return STMT_GET.get(guildId);
}

function updateConfig(guildId, fields) {
  const existing = getConfig(guildId);
  if (existing) {
    const sets   = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(fields), Math.floor(Date.now() / 1000), guildId];
    db.prepare(`UPDATE greeting_config SET ${sets}, updated_at = ? WHERE guild_id = ?`).run(...values);
  } else {
    const keys   = ['guild_id', ...Object.keys(fields), 'updated_at'];
    const phs    = keys.map(() => '?').join(', ');
    const values = [guildId, ...Object.values(fields), Math.floor(Date.now() / 1000)];
    db.prepare(`INSERT INTO greeting_config (${keys.join(', ')}) VALUES (${phs})`).run(...values);
  }
}

function formatMessage(template, member) {
  if (!template) return '';
  return template
    .replace(/\{user\}/g,     `<@${member.id}>`)
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{server\}/g,   member.guild.name)
    .replace(/\{count\}/g,    String(member.guild.memberCount));
}

module.exports = { getConfig, updateConfig, formatMessage };
