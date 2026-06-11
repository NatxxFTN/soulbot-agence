'use strict';

// ═══════════════════════════════════════════════
// CONFIG VALIDATORS — Studio /botconfig V5 (SecOps)
// Validation stricte de TOUTE entrée utilisateur du Studio
// avant qu'elle ne touche le draft (et a fortiori la DB).
// Chaque validateur renvoie { ok: true, value } (valeur normalisée)
// ou { ok: false, error } (message FR affichable tel quel).
// ═══════════════════════════════════════════════

const HEX_RE = /^#?[0-9A-Fa-f]{6}$/;
const URL_MAX = 2048;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp)(\?.*)?$/i;
const EMOJI_ID_RE = /^\d{17,20}$/;
const EMOJI_MENTION_RE = /^<a?:\w{2,32}:(\d{17,20})>$/;

const EMBED_STYLES = ['compact', 'rich', 'minimal'];
const THEME_NAMES  = ['magenta', 'cyber', 'mono', 'or', 'custom'];

/**
 * Couleur hex 6 digits, avec ou sans # en entrée.
 * Normalise en MAJUSCULES SANS # (format de stockage guild_bot_config).
 */
function validateHexColor(input) {
  const raw = String(input ?? '').trim();
  if (!HEX_RE.test(raw)) {
    return { ok: false, error: 'Couleur invalide — format attendu : `#RRGGBB` (ex. `#B600A8`).' };
  }
  return { ok: true, value: raw.replace(/^#/, '').toUpperCase() };
}

/**
 * URL d'image : https uniquement, extension image, longueur bornée.
 * Rejette data:/blob:/javascript: par construction (protocole !== https).
 * Chaîne vide → { ok: true, value: null } (= reset du champ).
 */
function validateImageUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > URL_MAX) {
    return { ok: false, error: `URL trop longue (max ${URL_MAX} caractères).` };
  }
  let url;
  try { url = new URL(raw); }
  catch { return { ok: false, error: 'URL invalide — vérifie le format.' }; }
  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Seules les URLs **https** sont acceptées.' };
  }
  if (!IMAGE_EXT_RE.test(url.pathname)) {
    return { ok: false, error: 'Extension non autorisée — formats : `.png` `.jpg` `.jpeg` `.gif` `.webp`.' };
  }
  return { ok: true, value: url.href };
}

/** Nickname Discord : 1-32 caractères. Vide → null (reset). */
function validateNickname(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > 32) {
    return { ok: false, error: 'Nickname trop long — 32 caractères maximum (limite Discord).' };
  }
  return { ok: true, value: raw };
}

/** Texte de footer custom : 256 caractères max. Vide → null (footer par défaut). */
function validateFooterText(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > 256) {
    return { ok: false, error: 'Footer trop long — 256 caractères maximum.' };
  }
  return { ok: true, value: raw };
}

/** Style d'embed : compact | rich | minimal. */
function validateEmbedStyle(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!EMBED_STYLES.includes(raw)) {
    return { ok: false, error: `Style inconnu — valeurs : ${EMBED_STYLES.map(s => `\`${s}\``).join(' ')}.` };
  }
  return { ok: true, value: raw };
}

/** Nom de thème intégré ou custom. */
function validateThemeName(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!THEME_NAMES.includes(raw)) {
    return { ok: false, error: `Thème inconnu — valeurs : ${THEME_NAMES.map(t => `\`${t}\``).join(' ')}.` };
  }
  return { ok: true, value: raw };
}

/**
 * Emoji custom : accepte l'ID brut ou la mention `<:nom:id>` / `<a:nom:id>`.
 * Normalise en ID seul. Vide → null.
 */
function validateBrandEmoji(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (EMOJI_ID_RE.test(raw)) return { ok: true, value: raw };
  const m = raw.match(EMOJI_MENTION_RE);
  if (m) return { ok: true, value: m[1] };
  return { ok: false, error: 'Emoji invalide — colle l\'emoji custom (`<:nom:id>`) ou son ID.' };
}

/** Nom de preset : 1-50 caractères, pas de retour ligne. */
function validatePresetName(input) {
  const raw = String(input ?? '').trim().replace(/\s+/g, ' ');
  if (!raw) return { ok: false, error: 'Nom de preset vide.' };
  if (raw.length > 50) return { ok: false, error: 'Nom de preset trop long — 50 caractères maximum.' };
  return { ok: true, value: raw };
}

/** Prefix : 1-5 caractères sans espace (même règle que ;botconfig prefix). */
function validatePrefix(input) {
  const raw = String(input ?? '').trim();
  if (!raw || raw.length > 5 || /\s/.test(raw)) {
    return { ok: false, error: 'Prefix invalide — 1 à 5 caractères sans espace.' };
  }
  return { ok: true, value: raw };
}

/* ═══ V6 — profil global du bot ═══ */

const PRESENCE_STATUSES = ['online', 'idle', 'dnd', 'invisible'];
const PRESENCE_TYPES    = ['playing', 'watching', 'listening', 'competing', 'streaming', 'custom'];
const STREAM_HOSTS_RE   = /(^|\.)?(twitch\.tv|youtube\.com)$/i;

/** Bio "À propos de moi" de l'app : 400 caractères max (limite Discord). Vide → null. */
function validateBio(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > 400) {
    return { ok: false, error: 'Bio trop longue — 400 caractères maximum (limite Discord).' };
  }
  return { ok: true, value: raw };
}

/** Texte d'activité (statut) : 128 caractères max. Vide → null (présence par défaut). */
function validatePresenceText(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > 128) {
    return { ok: false, error: 'Texte de statut trop long — 128 caractères maximum.' };
  }
  return { ok: true, value: raw };
}

/** Statut de présence : online | idle | dnd | invisible. */
function validatePresenceStatus(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!PRESENCE_STATUSES.includes(raw)) {
    return { ok: false, error: `Statut inconnu — valeurs : ${PRESENCE_STATUSES.map(s => `\`${s}\``).join(' ')}.` };
  }
  return { ok: true, value: raw };
}

/** Type d'activité : playing | watching | listening | competing | streaming | custom. */
function validatePresenceType(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!PRESENCE_TYPES.includes(raw)) {
    return { ok: false, error: `Type inconnu — valeurs : ${PRESENCE_TYPES.map(t => `\`${t}\``).join(' ')}.` };
  }
  return { ok: true, value: raw };
}

/** URL de stream (présence streaming) : https + twitch.tv/youtube.com only. Vide → null. */
function validateStreamUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: null };
  let url;
  try { url = new URL(raw); }
  catch { return { ok: false, error: 'URL invalide — vérifie le format.' }; }
  if (url.protocol !== 'https:' || !STREAM_HOSTS_RE.test(url.hostname.replace(/^www\./, ''))) {
    return { ok: false, error: 'URL de stream invalide — **https** + `twitch.tv` ou `youtube.com` uniquement.' };
  }
  return { ok: true, value: url.href };
}

/** Username global du bot : 2-32 caractères, sans @ # : ``` ni "discord". */
function validateUsername(input) {
  const raw = String(input ?? '').trim();
  if (raw.length < 2 || raw.length > 32) {
    return { ok: false, error: 'Username invalide — 2 à 32 caractères.' };
  }
  if (/[@#:]|```/.test(raw) || /discord/i.test(raw)) {
    return { ok: false, error: 'Username refusé par Discord — pas de `@` `#` `:` ni "discord" dans le nom.' };
  }
  return { ok: true, value: raw };
}

// Mapping champ identité → validateur, pour router les modals du Studio
// sans switch géant dans le handler.
const FIELD_VALIDATORS = {
  nickname        : validateNickname,
  banner_url      : validateImageUrl,
  avatar_url      : validateImageUrl,
  footer_icon_url : validateImageUrl,
  embed_color     : validateHexColor,
  accent_color    : validateHexColor,
  footer_text     : validateFooterText,
  embed_style     : validateEmbedStyle,
  theme_name      : validateThemeName,
  brand_emoji_id  : validateBrandEmoji,
  // V6 — couleurs + emojis sémantiques par serveur
  color_success   : validateHexColor,
  color_error     : validateHexColor,
  color_warning   : validateHexColor,
  color_info      : validateHexColor,
  emoji_success_id: validateBrandEmoji,
  emoji_error_id  : validateBrandEmoji,
  emoji_warning_id: validateBrandEmoji,
  emoji_info_id   : validateBrandEmoji,
};

// Champs du profil GLOBAL du bot (onglet Profil Bot — BotOwner only).
const PROFILE_VALIDATORS = {
  bio            : validateBio,
  banner_url     : validateImageUrl,
  presence_status: validatePresenceStatus,
  presence_type  : validatePresenceType,
  presence_text  : validatePresenceText,
  presence_url   : validateStreamUrl,
  username       : validateUsername,
};

module.exports = {
  EMBED_STYLES,
  THEME_NAMES,
  PRESENCE_STATUSES,
  PRESENCE_TYPES,
  FIELD_VALIDATORS,
  PROFILE_VALIDATORS,
  validateHexColor,
  validateImageUrl,
  validateNickname,
  validateFooterText,
  validateEmbedStyle,
  validateThemeName,
  validateBrandEmoji,
  validatePresetName,
  validatePrefix,
  validateBio,
  validatePresenceText,
  validatePresenceStatus,
  validatePresenceType,
  validateStreamUrl,
  validateUsername,
};
