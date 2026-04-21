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

const CATEGORY_TO_EMOJI = {
  'Owner':         'cat_owner',
  'Moderation':    'cat_moderation',
  'Modération':    'cat_moderation',
  'Information':   'cat_information',
  'Info':          'cat_information',
  'Utility':       'cat_utility',
  'Utile':         'cat_utility',
  'Configuration': 'cat_configuration',
  'Config':        'cat_configuration',
  'Protection':    'cat_protection',
  'Fun':           'cat_fun',
  'Giveaway':      'cat_giveaway',
  'Greeting':      'cat_greeting',
  'Welcomer':      'cat_greeting',
  'Level':         'cat_level',
  'Niveau':        'cat_level',
  'Economy':       'cat_economy',
  'Économie':      'cat_economy',
  'Ticket':        'cat_ticket',
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
  const key = CATEGORY_TO_EMOJI[category];
  if (!key) return FALLBACK_EMOJIS.cat_information || 'ℹ️';
  return e(key);
}

/**
 * Emoji catégorie pour ButtonBuilder.setEmoji().
 */
function categoryEmojiForButton(category) {
  const key = CATEGORY_TO_EMOJI[category];
  if (!key) return forButton('cat_information');
  return forButton(key);
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
