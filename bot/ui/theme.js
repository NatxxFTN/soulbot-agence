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

// ═══════════════════════════════════════════════
// SOC — palette de posture sémantique + thèmes du dashboard image
// (Defense Grid 2A). Couleurs DESIGN.md : success #00FF88, warning #FFD700.
// ═══════════════════════════════════════════════

const SOC_POSTURE = {
  SECURE  : { accent: 0x00FF88, hex: '#00FF88', label: 'SECURE'   },
  ELEVATED: { accent: 0xFFD700, hex: '#FFD700', label: 'ELEVATED' },
  BREACH  : { accent: 0xFF0000, hex: '#FF0000', label: 'BREACH'   },
};

// Thèmes du renderer image — chaque preset redéfinit les couleurs du PNG.
// L'accent du container CV2 suit la POSTURE, pas le thème (posture > déco).
const SOC_THEMES = {
  red_alert: {
    label: 'RED ALERT',
    bg: '#0A0A0A', panel: '#141414', border: '#2A2A2A', grid: 'rgba(255,0,0,0.05)',
    text: '#F5F5F5', muted: '#666666', accent: '#FF0000',
    ok: '#00FF88', warn: '#FFD700', bad: '#FF3333',
  },
  matrix: {
    label: 'MATRIX',
    bg: '#020A02', panel: '#06140A', border: '#103018', grid: 'rgba(0,255,100,0.06)',
    text: '#C8FFD8', muted: '#3E6B4C', accent: '#00FF66',
    ok: '#00FF66', warn: '#AAFF00', bad: '#FF5544',
  },
  ice: {
    label: 'ICE',
    bg: '#04080F', panel: '#0A1422', border: '#1A2C44', grid: 'rgba(80,160,255,0.06)',
    text: '#DCEBFF', muted: '#46627F', accent: '#4499FF',
    ok: '#44DDFF', warn: '#FFD700', bad: '#FF4466',
  },
  mono: {
    label: 'MONO',
    bg: '#0C0C0C', panel: '#161616', border: '#2E2E2E', grid: 'rgba(255,255,255,0.04)',
    text: '#EEEEEE', muted: '#777777', accent: '#FFFFFF',
    ok: '#CCCCCC', warn: '#999999', bad: '#FFFFFF',
  },
};

module.exports = { COLORS, HEX, EMOJIS, LABELS, SOC_POSTURE, SOC_THEMES };
