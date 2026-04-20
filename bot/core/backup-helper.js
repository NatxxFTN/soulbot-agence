'use strict';

const fs   = require('fs');
const path = require('path');

const BACKUPS_DIR = path.join(__dirname, '../../data/backups');

function ensureDir() {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Crée un backup JSON de la structure du serveur (rôles, salons, emojis).
 * @param {import('discord.js').Guild} guild
 * @param {string} label  — label court (ex: "nuke-classique")
 * @returns {string} nom du fichier créé
 */
function createBackup(guild, label = 'backup') {
  ensureDir();

  const timestamp = Date.now();
  const filename  = `${guild.id}_${timestamp}_${label}.json`.replace(/[^a-zA-Z0-9_\-.]/g, '_');

  const data = {
    guildId     : guild.id,
    guildName   : guild.name,
    memberCount : guild.memberCount,
    createdAt   : timestamp,
    label,
    roles: guild.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id          : r.id,
        name        : r.name,
        color       : r.color,
        hoist       : r.hoist,
        position    : r.position,
        permissions : r.permissions.bitfield.toString(),
        mentionable : r.mentionable,
        managed     : r.managed,
      })),
    channels: guild.channels.cache.map(c => ({
      id       : c.id,
      name     : c.name,
      type     : c.type,
      parentId : c.parentId ?? null,
      position : c.position,
    })),
    emojis: guild.emojis.cache.map(e => ({
      id       : e.id,
      name     : e.name,
      animated : e.animated,
    })),
  };

  fs.writeFileSync(path.join(BACKUPS_DIR, filename), JSON.stringify(data, null, 2));
  return filename;
}

/**
 * Liste les backups d'un serveur, du plus récent au plus ancien.
 * @param {string} guildId
 * @returns {string[]}
 */
function listBackups(guildId) {
  ensureDir();
  return fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith(guildId + '_') && f.endsWith('.json'))
    .sort()
    .reverse();
}

module.exports = { createBackup, listBackups };
