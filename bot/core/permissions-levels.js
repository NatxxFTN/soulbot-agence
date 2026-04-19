'use strict';

const LEVELS = {
  OWNER    : 100,
  ADMIN    :  80,
  MOD      :  50,
  USER     :  10,
  BLACKLIST:  -1,
};

// Niveau requis par catégorie de commande.
// Les catégories absentes → USER (10) par défaut.
const CATEGORY_LEVELS = {
  owner        : LEVELS.OWNER,
  moderation   : LEVELS.MOD,
  configuration: LEVELS.ADMIN,
  protection   : LEVELS.ADMIN,
};

const LEVEL_LABELS = {
  [LEVELS.OWNER]    : '🔒 Owner',
  [LEVELS.ADMIN]    : '👑 Admin',
  [LEVELS.MOD]      : '🛡️ Modérateur',
  [LEVELS.USER]     : '👤 Utilisateur',
  [LEVELS.BLACKLIST]: '🚫 Blacklisté',
};

function levelName(level) {
  return LEVEL_LABELS[level] ?? `Niveau ${level}`;
}

function getRequiredLevel(cmd) {
  if (cmd.ownerOnly) return LEVELS.OWNER;
  return CATEGORY_LEVELS[cmd.category] ?? LEVELS.USER;
}

module.exports = { LEVELS, CATEGORY_LEVELS, levelName, getRequiredLevel };
