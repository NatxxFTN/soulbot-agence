'use strict';

// ═══════════════════════════════════════════════
// SOULBOT EMOJIS — Wrapper central (statique + animé)
// Utilise emoji-cache.js comme stockage, enrichit
// avec FALLBACK_EMOJIS, forButton, categoryEmoji
// ═══════════════════════════════════════════════

const { getEmoji, getEmojiId, loadCache } = require('./emoji-cache');

// ─── Fallbacks Unicode ────────────────────────────────────────────────────────

const FALLBACK_EMOJIS = {
  // Catégories
  cat_owner:         '👑',
  cat_moderation:    '🔨',
  cat_information:   'ℹ️',
  cat_utility:       '🔧',
  cat_configuration: '⚙️',
  cat_protection:    '🛡️',
  cat_fun:           '🎮',
  cat_giveaway:      '🎉',
  cat_greeting:      '👋',
  cat_level:         '🎓',
  cat_economy:       '💰',
  cat_ticket:        '🎫',
  // Boutons
  btn_home:     '🏠',
  btn_search:   '🔍',
  btn_trash:    '🗑️',
  btn_edit:     '✏️',
  btn_help:     '❓',
  btn_tip:      '💡',
  btn_success:  '✅',
  btn_error:    '❌',
  btn_flag:     '🚩',
  btn_calendar: '📅',
  btn_prev:     '◀',
  btn_next:     '▶',
  btn_first:    '⏮',
  btn_last:     '⏭',
  // UI
  ui_chat:        '💬',
  ui_mic:         '🎤',
  ui_speaker:     '🔊',
  ui_mail:        '📧',
  ui_mail_letter: '📬',
  ui_antileak:    '🚫',
  ui_antispam:    '🛡️',
  ui_pin:         '📌',
  ui_leaf:        '🍃',
  ui_waves:       '〰️',
  ui_smiley:      '😊',
  ui_bulb:        '💡',
  ui_git:         '🔶',
  // Animés (ani_world = globe animé dans les assets)
  ani_world:   '🌍',
  ani_globe:   '🌍',
  ani_coin:    '🪙',
  ani_loading: '⏳',
  ani_dice:    '🎲',
};

// ─── Mapping catégorie → emoji key ───────────────────────────────────────────
// Clés = noms de dossiers bot/commands/* (capitalisés par scanCommands)
// ou variantes FR/EN. Les cat_* sans fichier uploadé ont un fallback Unicode.

const CATEGORY_TO_EMOJI = {
  // Owner
  'Owner':          'cat_owner',
  // Moderation (cat_moderation pas uploadé → fallback 🔨 depuis FALLBACK_EMOJIS)
  'Moderation':     'cat_moderation',
  'Modération':     'cat_moderation',
  'Mod':            'cat_moderation',
  // Information
  'Information':    'cat_information',
  'Info':           'cat_information',
  // Utility (cat_utility pas uploadé → fallback 🔧)
  'Utility':        'cat_utility',
  'Utile':          'cat_utility',
  'Utilities':      'cat_utility',
  'Utils':          'cat_utility',
  // Configuration
  'Configuration':  'cat_configuration',
  'Config':         'cat_configuration',
  // Protection
  'Protection':     'cat_protection',
  // Fun (cat_fun pas uploadé → fallback 🎮)
  'Fun':            'cat_fun',
  'Game':           'cat_fun',
  'Games':          'cat_fun',
  // Giveaway
  'Giveaway':       'cat_giveaway',
  'Giveaways':      'cat_giveaway',
  // Greeting / Welcomer
  'Greeting':       'cat_greeting',
  'Welcomer':       'cat_greeting',
  'Welcome':        'cat_greeting',
  // Level
  'Level':          'cat_level',
  'Levels':         'cat_level',
  'Niveau':         'cat_level',
  'Niveaux':        'cat_level',
  // Economy
  'Economy':        'cat_economy',
  'Économie':       'cat_economy',
  'Economie':       'cat_economy',
  // Ticket
  'Ticket':         'cat_ticket',
  'Tickets':        'cat_ticket',
  // Stats → cat_information (pas de cat_stats uploadé)
  'Stats':          'cat_information',
  'Statistique':    'cat_information',
  'Statistiques':   'cat_information',
  // Role → cat_configuration (pas de cat_role uploadé)
  'Role':           'cat_configuration',
  'Roles':          'cat_configuration',
  'Rôle':           'cat_configuration',
  // Invitation → cat_information
  'Invitation':     'cat_information',
  'Logs':           'cat_information',
  'Custom':         'cat_configuration',
  'Automod':        'cat_protection',
};

// ─── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Retourne la string d'emoji Discord.
 * Fallback Unicode si non uploadé.
 * @param {string} name - 'cat_owner', 'ani_coin', 'btn_home', etc.
 */
function e(name) {
  const fallback = FALLBACK_EMOJIS[name] || '📁';
  return getEmoji(name, fallback);
}

/**
 * Pour ButtonBuilder.setEmoji() : retourne objet { name, id, animated }
 * ou string Unicode fallback.
 */
function forButton(name) {
  const entry = getEmojiId(name);
  if (entry && entry.id) {
    return { name, id: entry.id, animated: !!entry.animated };
  }
  return FALLBACK_EMOJIS[name] || '📁';
}

/**
 * Emoji pour une catégorie de commandes (string prête à l'emploi).
 */
function categoryEmoji(category) {
  if (!category) return e('cat_information');
  const raw  = category.toString().trim();
  const name = CATEGORY_TO_EMOJI[raw] || CATEGORY_TO_EMOJI[raw.charAt(0).toUpperCase() + raw.slice(1)] || 'cat_information';
  return e(name);
}

/**
 * Emoji catégorie pour ButtonBuilder.setEmoji() / options StringSelect.
 * Retourne { name, id, animated } si uploadé, sinon string Unicode.
 */
function categoryEmojiForButton(category) {
  if (!category) return forButton('cat_information');
  const raw  = category.toString().trim();
  const name = CATEGORY_TO_EMOJI[raw] || CATEGORY_TO_EMOJI[raw.charAt(0).toUpperCase() + raw.slice(1)] || 'cat_information';
  return forButton(name);
}

/**
 * Recharge le cache depuis le disque (appeler au démarrage du bot).
 */
function reload() {
  const cache = loadCache();
  console.log(`[emojis] ${Object.keys(cache).length} emojis chargés`);
}

module.exports = {
  e,
  forButton,
  categoryEmoji,
  categoryEmojiForButton,
  reload,
  FALLBACK_EMOJIS,
  CATEGORY_TO_EMOJI,
};
