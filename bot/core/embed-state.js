'use strict';

// ── Embed Builder — State Manager ─────────────────────────────────────────────
// Stocke l'état de construction d'embed en mémoire, par userId.
// Nettoyage automatique après 15 min d'inactivité.

const INACTIVITY_MS = 15 * 60 * 1000;

function blankEmbed() {
  return {
    title      : null,
    titleUrl   : null,
    description: null,
    color      : null,
    author     : null,
    thumbnail  : null,
    image      : null,
    footer     : null,
    timestamp  : null,
    fields     : [],
  };
}

/** @type {Map<string, object>} */
const states = new Map();

function createState(userId, guildId, channelId) {
  const now = new Date();
  const state = {
    userId,
    guildId,
    channelId,
    messageId       : null,
    targetChannelId : null,
    embed           : blankEmbed(),
    createdAt       : now,
    updatedAt       : now,
  };
  states.set(userId, state);
  return state;
}

function getState(userId) {
  return states.get(userId) ?? null;
}

function _touch(userId) {
  const s = states.get(userId);
  if (s) s.updatedAt = new Date();
}

function updateState(userId, partial) {
  const s = states.get(userId);
  if (!s) return false;
  Object.assign(s.embed, partial);
  _touch(userId);
  return true;
}

function updateField(userId, fieldIndex, partial) {
  const s = states.get(userId);
  if (!s || !s.embed.fields[fieldIndex]) return false;
  Object.assign(s.embed.fields[fieldIndex], partial);
  _touch(userId);
  return true;
}

function addField(userId, field) {
  const s = states.get(userId);
  if (!s || s.embed.fields.length >= 25) return false;
  s.embed.fields.push({ name: '', value: '', inline: false, ...field });
  _touch(userId);
  return true;
}

function removeField(userId, fieldIndex) {
  const s = states.get(userId);
  if (!s || fieldIndex < 0 || fieldIndex >= s.embed.fields.length) return false;
  s.embed.fields.splice(fieldIndex, 1);
  _touch(userId);
  return true;
}

function moveField(userId, fromIdx, toIdx) {
  const s = states.get(userId);
  if (!s) return false;
  const fields = s.embed.fields;
  if (fromIdx < 0 || fromIdx >= fields.length) return false;
  if (toIdx   < 0 || toIdx   >= fields.length) return false;
  const [item] = fields.splice(fromIdx, 1);
  fields.splice(toIdx, 0, item);
  _touch(userId);
  return true;
}

function resetState(userId) {
  const s = states.get(userId);
  if (!s) return false;
  s.embed     = blankEmbed();
  s.updatedAt = new Date();
  return true;
}

function deleteState(userId) {
  return states.delete(userId);
}

function cleanup() {
  const cutoff = Date.now() - INACTIVITY_MS;
  for (const [userId, state] of states) {
    if (state.updatedAt.getTime() < cutoff) {
      states.delete(userId);
    }
  }
}

// Nettoyage toutes les minutes
setInterval(cleanup, 60 * 1000).unref();

module.exports = {
  createState,
  getState,
  updateState,
  updateField,
  addField,
  removeField,
  moveField,
  resetState,
  deleteState,
  cleanup,
};
