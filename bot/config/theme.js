'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// THEME — Couleurs et constantes visuelles ServerForge × Soulbot
// ═══════════════════════════════════════════════════════════════════════════════
// Nouveau thème : Violet électrique — abandon du rouge (#FF0000)
// Couleur choisie : #8B5CF6 (Violet électrique) — moderne, premium, contraste
// optimal sur fond noir Discord.
//
// Référence DESIGN.md : les tokens ci-dessous remplacent progressivement
// l'ancienne charte rouge.
// ═══════════════════════════════════════════════════════════════════════════════

const THEME = {
  /** Violet électrique — nouvelle couleur primaire premium */
  COLOR_PRIMARY: 0x8B5CF6,

  /** Violet foncé — pour hover, bordures, surfaces secondaires */
  COLOR_PRIMARY_DARK: 0x6D28D9,

  /** Violet clair — lueur, glow, accents */
  COLOR_PRIMARY_GLOW: 0xA78BFA,

  /** Vert succès — confirmation, action réussie */
  COLOR_SUCCESS: 0x10B981,

  /** Rouge erreur — refus, accès interdit, crash */
  COLOR_ERROR: 0xEF4444,

  /** Jaune avertissement — action irréversible imminente */
  COLOR_WARNING: 0xF59E0B,

  /** Bleu information — aide, documentation, neutre */
  COLOR_INFO: 0x3B82F6,

  /** Or — récompense, mise en avant (starboard) */
  COLOR_GOLD: 0xFFD700,

  /** Gris — état intermédiaire, embed de transition */
  COLOR_NEUTRAL: 0x6B7280,

  /** Texte du footer sur tous les embeds */
  FOOTER_TEXT: 'Soulbot × ServerForge',

  /** URL icône footer (null = pas d'icône) */
  FOOTER_ICON: null,

  /** Préfixe des commandes textuelles */
  PREFIX: ';',

  /** Emojis utilisés dans les titres d'embed */
  ICONS: {
    SUCCESS: '✓',
    ERROR: '✗',
    WARNING: '⚠',
    INFO: 'ℹ',
    STATS: '📊',
    USAGE: '📌',
    SERVERFORGE: '⚡',
  },

  /** Couleurs pour les rôles par défaut (hex strings) */
  ROLE_COLORS: {
    FONDATEUR: '#8B5CF6',
    ADMIN: '#6D28D9',
    MODERATEUR: '#F59E0B',
    VIP: '#EC4899',
    MEMBRE: '#10B981',
    BOTS: '#3B82F6',
    SEPARATOR: '#2C2F33',
  },
};

module.exports = { THEME };
