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
  ui_folder:      '📁',
  folder:         '📁',
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
  'Owner': 'cat_owner', 'owner': 'cat_owner',
  // Moderation
  'Moderation': 'cat_moderation', 'moderation': 'cat_moderation',
  'Modération': 'cat_moderation', 'modération': 'cat_moderation',
  'Mod': 'cat_moderation', 'mod': 'cat_moderation', 'MODERATION': 'cat_moderation',
  // Information
  'Information': 'cat_information', 'information': 'cat_information',
  'Info': 'cat_information', 'info': 'cat_information',
  // Utility
  'Utility': 'cat_utility', 'utility': 'cat_utility',
  'Utilities': 'cat_utility', 'utilities': 'cat_utility',
  'Utils': 'cat_utility', 'utils': 'cat_utility',
  'Utile': 'cat_utility', 'utile': 'cat_utility',
  'Utilité': 'cat_utility', 'utilité': 'cat_utility', 'UTILITY': 'cat_utility',
  // Configuration
  'Configuration': 'cat_configuration', 'configuration': 'cat_configuration',
  'Config': 'cat_configuration', 'config': 'cat_configuration',
  // Protection
  'Protection': 'cat_protection', 'protection': 'cat_protection',
  // Fun
  'Fun': 'cat_fun', 'fun': 'cat_fun', 'Funs': 'cat_fun', 'funs': 'cat_fun', 'FUN': 'cat_fun',
  'Game': 'cat_fun', 'game': 'cat_fun',
  'Games': 'cat_fun', 'games': 'cat_fun',
  // Giveaway
  'Giveaway': 'cat_giveaway', 'giveaway': 'cat_giveaway',
  'Giveaways': 'cat_giveaway', 'giveaways': 'cat_giveaway',
  // Greeting / Welcomer
  'Greeting': 'cat_greeting', 'greeting': 'cat_greeting',
  'Welcomer': 'cat_greeting', 'welcomer': 'cat_greeting',
  'Welcome': 'cat_greeting', 'welcome': 'cat_greeting',
  // Level
  'Level': 'cat_level', 'level': 'cat_level',
  'Levels': 'cat_level', 'levels': 'cat_level',
  'Niveau': 'cat_level', 'niveau': 'cat_level',
  'Niveaux': 'cat_level', 'niveaux': 'cat_level',
  // Economy
  'Economy': 'cat_economy', 'economy': 'cat_economy',
  'Économie': 'cat_economy', 'économie': 'cat_economy',
  'Economie': 'cat_economy', 'economie': 'cat_economy',
  'Eco': 'cat_economy', 'eco': 'cat_economy',
  // Ticket
  'Ticket': 'cat_ticket', 'ticket': 'cat_ticket',
  'Tickets': 'cat_ticket', 'tickets': 'cat_ticket', 'TICKET': 'cat_ticket',
  // Stats → cat_information (pas de cat_stats uploadé)
  'Stats': 'cat_information', 'stats': 'cat_information',
  'Statistique': 'cat_information', 'statistique': 'cat_information',
  'Statistiques': 'cat_information', 'statistiques': 'cat_information',
  // Role → cat_configuration (pas de cat_role uploadé)
  'Role': 'cat_configuration', 'role': 'cat_configuration',
  'Roles': 'cat_configuration', 'roles': 'cat_configuration',
  'Rôle': 'cat_configuration', 'rôle': 'cat_configuration',
  // Divers
  'Invitation': 'cat_information', 'invitation': 'cat_information',
  'Logs': 'cat_information', 'logs': 'cat_information',
  'Custom': 'cat_configuration', 'custom': 'cat_configuration',
  'Automod': 'cat_protection', 'automod': 'cat_protection',
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

function _resolveCategoryKey(category) {
  const raw = category.toString().trim();
  const noAccent = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return CATEGORY_TO_EMOJI[raw]
    || CATEGORY_TO_EMOJI[raw.toLowerCase()]
    || CATEGORY_TO_EMOJI[raw.charAt(0).toUpperCase() + raw.slice(1)]
    || CATEGORY_TO_EMOJI[noAccent]
    || CATEGORY_TO_EMOJI[noAccent.toLowerCase()]
    || CATEGORY_TO_EMOJI[noAccent.charAt(0).toUpperCase() + noAccent.slice(1)]
    || null;
}

/**
 * Emoji pour une catégorie de commandes (string prête à l'emploi).
 */
function categoryEmoji(category) {
  if (!category) return e('cat_information');
  const name = _resolveCategoryKey(category);
  if (!name) console.warn(`[emojis] Catégorie non mappée : "${category}"`);
  return e(name || 'cat_information');
}

/**
 * Emoji catégorie pour ButtonBuilder.setEmoji() / options StringSelect.
 * Retourne { name, id, animated } si uploadé, sinon objet Unicode.
 */
function categoryEmojiForButton(category) {
  if (!category) return forButton('cat_information');
  const name = _resolveCategoryKey(category);
  if (!name) console.warn(`[emojis] Catégorie non mappée (button) : "${category}"`);
  return forButton(name || 'cat_information');
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
