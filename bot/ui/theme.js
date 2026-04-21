'use strict';

const { getEmoji } = require('../core/emoji-cache');

// ═══════════════════════════════════════════════
// SOULBOT THEME — Noir & Rouge Premium
// ═══════════════════════════════════════════════

const COLORS = {
  accent:       0xFF0000,
  accent_dark:  0xCC0000,
  accent_soft:  0xE63946,
  bg_deep:      0x0A0A0A,
  bg_secondary: 0x1A1A1A,
  bg_card:      0x2C2C2C,
  text_primary: 0xF5F5F5,
  text_muted:   0x666666,
  success:      0x10B981,
  danger:       0xFF0000,
  warning:      0xF59E0B,
  info:         0x3B82F6,
  secondary:    0x6366F1,
  dark:         0x0A0A0A,
  surface:      0x1A1A1D,
  muted:        0x6B7280,
  primary:      0xFF0000,
};

const HEX = {
  accent:      '#FF0000',
  accent_dark: '#CC0000',
  bg_deep:     '#0A0A0A',
  success:     '#10B981',
};

const EMOJIS = {
  // Custom (via emoji-cache)
  shield   : () => getEmoji('ui_antileak',   '🛡️'),
  save     : () => getEmoji('ui_save',       '💾'),
  addGuild : () => getEmoji('ui_add_guild',  '➕'),
  search   : () => getEmoji('btn_search',    '🔍'),
  mod      : () => getEmoji('cat_moderation','🔨'),
  warning  : () => getEmoji('btn_flag',      '⚠️'),
  check    : () => getEmoji('btn_success',   '✅'),
  cross    : () => getEmoji('btn_error',     '❌'),
  plus     : () => getEmoji('ui_plus',       '➕'),
  minus    : () => getEmoji('ui_minus',      '➖'),
  dev      : () => getEmoji('ui_git',        '👨‍💻'),
  star     : () => getEmoji('ui_star',       '⭐'),
  chat     : () => getEmoji('ui_chat',       '💬'),

  // Navigation
  first:   '⏮️',
  prev:    '◀️',
  next:    '▶️',
  last:    '⏭️',
  back:    '↩️',
  refresh: '🔄',

  // Thématiques
  bot:      '🔴',
  on:       '🟢',
  off:      '🔴',
  config:   '⚙️',
  channel:  '#️⃣',
  message:  '💬',
  embed:    '🖼️',
  dm:       '📨',
  dmEmbed:  '💌',
  join:     '🔔',
  leave:    '👋',
  success:  '✅',
  error:    '❌',
  loading:  '⏳',
  info:     'ℹ️',
};

const LABELS = {
  activate:      'Activer',
  deactivate:    'Désactiver',
  configure:     'Configurer',
  reset:         'Réinitialiser',
  back:          'Retour',
  close:         'Fermer',
  save:          'Enregistrer',
  cancel:        'Annuler',
  confirm:       'Confirmer',
  statusOn:      'Activé',
  statusOff:     'Désactivé',
  notConfigured: 'Pas configurée',
  configured:    'Configurée',
  defined:       'Défini',
  notDefined:    'Non défini',
  selectChannel: 'Sélectionner un salon',
  selectRole:    'Sélectionner un rôle',
  selectOption:  'Sélectionner une option',
};

module.exports = { COLORS, HEX, EMOJIS, LABELS };
