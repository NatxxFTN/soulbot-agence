'use strict';

const { getEmoji } = require('../core/emoji-cache');

const COLORS = {
  accent:    0xF39C12,
  success:   0x10B981,
  danger:    0xEF4444,
  warning:   0xF59E0B,
  info:      0x3B82F6,
  secondary: 0x6366F1,
  dark:      0x0A0A0C,
  surface:   0x1A1A1D,
  muted:     0x6B7280,
};

// Emojis custom — fonctions (lues depuis le cache JSON à chaque appel)
// Fallback Unicode si l'emoji n'a pas encore été uploadé
const EMOJIS = {
  // Custom (via emoji-cache)
  shield   : () => getEmoji('ui_shield',    '🛡️'),
  save     : () => getEmoji('ui_save',      '💾'),
  addGuild : () => getEmoji('ui_add_guild', '➕'),
  search   : () => getEmoji('ui_search',    '🔍'),
  mod      : () => getEmoji('ui_mod',       '🔨'),
  warning  : () => getEmoji('ui_warning',   '⚠️'),
  check    : () => getEmoji('ui_check',     '✅'),
  cross    : () => getEmoji('ui_cross',     '❌'),
  plus     : () => getEmoji('ui_plus',      '➕'),
  minus    : () => getEmoji('ui_minus',     '➖'),
  dev      : () => getEmoji('ui_dev',       '👨‍💻'),
  star     : () => getEmoji('ui_star',      '⭐'),
  chat     : () => getEmoji('ui_chat',      '💬'),

  // Navigation — Unicode standards (pas besoin de custom)
  first:   '⏮️',
  prev:    '◀️',
  next:    '▶️',
  last:    '⏭️',
  back:    '↩️',
  refresh: '🔄',

  // Thématiques Unicode
  bot:      '🍊',
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

module.exports = { COLORS, EMOJIS, LABELS };
