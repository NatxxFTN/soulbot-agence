'use strict';

// ── Access Control Soulbot — 3 niveaux (BotOwner · Buyer · Owner) ─────────────
// ⚠️ DISTINCT DU FICHIER bot/core/permissions.js (système LEVELS existant).
// Ce module gère la WHITELIST d'accès au bot (middleware messageCreate).
//
// Hiérarchie :
//   BotOwner (process.env.BOT_OWNER_IDS / BOT_OWNERS) — globale, non-scopable
//     ↓ peut ajouter/retirer
//   Buyer    (table bot_buyers, scope par guild)
//     ↓ peut ajouter/retirer
//   Owner    (table bot_owners, scope par guild)
//     ↓ peut utiliser le bot

const storage = require('./access-storage');

function getBotOwnerIds() {
  const raw = process.env.BOT_OWNER_IDS || process.env.BOT_OWNERS || '';
  return raw.split(',').map(s => s.trim()).filter(s => /^\d{17,20}$/.test(s));
}

function isBotOwner(userId) {
  return getBotOwnerIds().includes(String(userId));
}

/**
 * Buyer effectif = BotOwner ∨ buyer DB guild-scoped.
 */
function isBuyer(guildId, userId) {
  if (isBotOwner(userId)) return true;
  return storage.isBuyer(guildId, userId);
}

/**
 * Owner effectif = BotOwner ∨ buyer ∨ owner DB guild-scoped.
 * Nommé isAuthorizedOwner pour ÉVITER LA COLLISION avec isOwner(userId)
 * de bot/core/permissions.js (qui est BotOwner only).
 */
function isAuthorizedOwner(guildId, userId) {
  if (isBotOwner(userId)) return true;
  if (storage.isBuyer(guildId, userId)) return true;
  return storage.isOwner(guildId, userId);
}

/**
 * Accès global au bot sur ce serveur (middleware whitelist).
 */
function hasAccess(guildId, userId) {
  return isBotOwner(userId)
      || storage.isBuyer(guildId, userId)
      || storage.isOwner(guildId, userId);
}

function getPermissionLevel(guildId, userId) {
  if (isBotOwner(userId))                return 'bot_owner';
  if (storage.isBuyer(guildId, userId))  return 'buyer';
  if (storage.isOwner(guildId, userId))  return 'owner';
  return 'none';
}

function getPermissionBadge(level) {
  const badges = {
    bot_owner: '💎 **BotOwner**',
    buyer    : '👑 **Buyer**',
    owner    : '🛡️ **Owner**',
    none     : '❌ Aucune',
  };
  return badges[level] || badges.none;
}

module.exports = {
  isBotOwner,
  isBuyer,
  isAuthorizedOwner,
  hasAccess,
  getPermissionLevel,
  getPermissionBadge,
  getBotOwnerIds,
};
