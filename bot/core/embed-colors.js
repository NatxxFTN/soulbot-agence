'use strict';

// ── Embed Builder — Couleurs ──────────────────────────────────────────────────

const COLOR_PRESETS = [
  { id: 'soulbot_red',   label: 'Rouge Soulbot',   hex: 0xFF0000, emoji: '🔴' },
  { id: 'premium_black', label: 'Noir Premium',    hex: 0x0A0A0A, emoji: '⚫' },
  { id: 'blood_red',     label: 'Rouge Sang',      hex: 0x8B0000, emoji: '🩸' },
  { id: 'luxe_gold',     label: 'Or Luxe',         hex: 0xFFD700, emoji: '💎' },
  { id: 'royal_blue',    label: 'Bleu Royal',      hex: 0x1E40AF, emoji: '🌊' },
  { id: 'success_green', label: 'Vert Succès',     hex: 0x10B981, emoji: '🌿' },
  { id: 'mystic_purple', label: 'Violet Mystique', hex: 0x7C3AED, emoji: '🔮' },
  { id: 'neon_pink',     label: 'Rose Néon',       hex: 0xEC4899, emoji: '🌸' },
  { id: 'alert_yellow',  label: 'Jaune Alerte',    hex: 0xEAB308, emoji: '⚡' },
  { id: 'lunar_grey',    label: 'Gris Lunaire',    hex: 0x6B7280, emoji: '🌙' },
];

function hexToDecimal(hex) {
  const cleaned = hex.replace(/^#|^0x/i, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
  return parseInt(cleaned, 16);
}

function decimalToHex(dec) {
  return '#' + dec.toString(16).padStart(6, '0').toUpperCase();
}

module.exports = { COLOR_PRESETS, hexToDecimal, decimalToHex };
