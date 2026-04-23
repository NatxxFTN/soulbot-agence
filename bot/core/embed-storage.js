'use strict';

// ── Embed Builder — Storage ───────────────────────────────────────────────────
// Sauvegarde/chargement des templates dans data/embed-templates.json.
// Écriture atomique via fichier temporaire + rename.

const fs   = require('fs');
const path = require('path');

const FILE        = path.join(__dirname, '../../data/embed-templates.json');
const USER_LIMIT  = 10;
const GUILD_LIMIT = 20;

// ── Lock mémoire (anti race) ──────────────────────────────────────────────────

let   _writing = false;
const _queue   = [];

function _readRaw() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { users: {}, guilds: {} };
  }
}

function _write(data) {
  return new Promise((resolve, reject) => {
    _queue.push({ data, resolve, reject });
    _flush();
  });
}

function _flush() {
  if (_writing || _queue.length === 0) return;
  _writing = true;
  const { data, resolve, reject } = _queue.shift();
  const tmp = FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, FILE);
    resolve();
  } catch (err) {
    reject(err);
  } finally {
    _writing = false;
    _flush();
  }
}

// ── Templates utilisateur ─────────────────────────────────────────────────────

function getUserTemplates(userId) {
  const data = _readRaw();
  return data.users[userId] ?? {};
}

function listUserTemplates(userId) {
  return Object.entries(getUserTemplates(userId))
    .map(([id, t]) => ({ id, name: id, ...t }));
}

async function saveUserTemplate(userId, name, embedData) {
  const data = _readRaw();
  if (!data.users[userId]) data.users[userId] = {};
  const tpls = data.users[userId];
  if (!tpls[name] && Object.keys(tpls).length >= USER_LIMIT) {
    return { ok: false, reason: `Limite atteinte (${USER_LIMIT} templates max par utilisateur).` };
  }
  tpls[name] = { ...embedData, savedAt: new Date().toISOString() };
  await _write(data);
  return { ok: true };
}

async function deleteUserTemplate(userId, name) {
  const data = _readRaw();
  if (!data.users[userId]?.[name]) return false;
  delete data.users[userId][name];
  await _write(data);
  return true;
}

// ── Templates serveur ─────────────────────────────────────────────────────────

function getGuildTemplates(guildId) {
  const data = _readRaw();
  return data.guilds[guildId] ?? {};
}

function listGuildTemplates(guildId) {
  return Object.entries(getGuildTemplates(guildId))
    .map(([id, t]) => ({ id, name: id, ...t }));
}

async function saveGuildTemplate(guildId, createdBy, name, embedData) {
  const data = _readRaw();
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  const tpls = data.guilds[guildId];
  if (!tpls[name] && Object.keys(tpls).length >= GUILD_LIMIT) {
    return { ok: false, reason: `Limite atteinte (${GUILD_LIMIT} templates max par serveur).` };
  }
  tpls[name] = { ...embedData, savedAt: new Date().toISOString(), createdBy };
  await _write(data);
  return { ok: true };
}

async function deleteGuildTemplate(guildId, name) {
  const data = _readRaw();
  if (!data.guilds[guildId]?.[name]) return false;
  delete data.guilds[guildId][name];
  await _write(data);
  return true;
}

// ── Rename (commun user / guild) ──────────────────────────────────────────────

async function renameTemplate(scope, ownerId, oldName, newName) {
  const data    = _readRaw();
  const section = scope === 'user' ? data.users : data.guilds;
  if (!section[ownerId]?.[oldName]) return false;
  section[ownerId][newName] = section[ownerId][oldName];
  delete section[ownerId][oldName];
  await _write(data);
  return true;
}

module.exports = {
  getUserTemplates,
  listUserTemplates,
  saveUserTemplate,
  deleteUserTemplate,
  getGuildTemplates,
  listGuildTemplates,
  saveGuildTemplate,
  deleteGuildTemplate,
  renameTemplate,
};
