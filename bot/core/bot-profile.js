'use strict';

// ═══════════════════════════════════════════════
// BOT PROFILE — Studio V6 (Total Control)
// Profil GLOBAL du bot : bio ("À propos de moi"), bannière de profil,
// présence (statut + activité), username. Table bot_profile (singleton
// id=1) — BotOwner only, persisté pour survivre aux restarts.
//
// Les side effects Discord (application.edit, setBanner, setUsername,
// setPresence) vivent ICI ; le handler Studio ne touche jamais l'API
// Discord directement pour le profil.
// ═══════════════════════════════════════════════

const { ActivityType } = require('discord.js');
const { db } = require('../database');
const { version } = require('../../package.json');

// Colonnes de bot_profile éditables par le Studio — allowlist stricte.
const PROFILE_FIELDS = [
  'bio', 'banner_url', 'presence_status', 'presence_type', 'presence_text', 'presence_url',
];

const TYPE_MAP = {
  playing  : ActivityType.Playing,
  watching : ActivityType.Watching,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
  streaming: ActivityType.Streaming,
  custom   : ActivityType.Custom,
};

const _get = db.prepare('SELECT * FROM bot_profile WHERE id = 1');

/** Profil global du bot (toujours présent — seedé à la migration). */
function getBotProfile() {
  return _get.get() ?? null;
}

/**
 * Application ATOMIQUE d'un draft de profil : update des champs modifiés
 * sur la ligne 1 + journal bot_config_log (field préfixé 'profile:' pour
 * l'onglet Historique du serveur où le changement a été fait).
 *
 * @param {Object} draft - sous-ensemble de PROFILE_FIELDS (valeurs validées)
 * @param {string} userId
 * @param {string} guildId - serveur depuis lequel le BotOwner a agi (audit)
 * @returns {string[]} champs réellement modifiés
 */
const applyProfileDraft = db.transaction((draft, userId, guildId) => {
  const before  = getBotProfile() ?? {};
  const changed = [];

  for (const field of PROFILE_FIELDS) {
    if (!(field in draft)) continue;
    const newValue = draft[field] ?? null;
    const oldValue = before[field] ?? null;
    if (newValue === oldValue) continue;

    // Nom de colonne issu de l'allowlist, jamais de l'input.
    db.prepare(`
      UPDATE bot_profile SET ${field} = ?, updated_at = unixepoch(), updated_by = ?
      WHERE id = 1
    `).run(newValue, userId);

    db.prepare(`
      INSERT INTO bot_config_log (guild_id, user_id, field, old_value, new_value)
      VALUES (?, ?, ?, ?, ?)
    `).run(guildId, userId, `profile:${field}`, oldValue, newValue);

    changed.push(field);
  }
  return changed;
});

/**
 * Payload setPresence depuis le profil stocké. Sans texte configuré,
 * retombe sur la présence par défaut "Version x.y.z" (comportement
 * historique de ready.js).
 * @param {?Object} [profile] - défaut : lecture DB
 */
function buildPresence(profile = getBotProfile()) {
  const status = profile?.presence_status ?? 'online';
  const text   = profile?.presence_text ?? `Version ${version}`;
  const type   = TYPE_MAP[profile?.presence_type ?? 'custom'] ?? ActivityType.Custom;

  const activity = { name: text, type };
  if (type === ActivityType.Streaming && profile?.presence_url) {
    activity.url = profile.presence_url;
  }
  return { activities: [activity], status };
}

/**
 * Applique la présence stockée — appelé au ready (restore après restart)
 * et à chaque Appliquer du Studio touchant la présence.
 * @param {import('discord.js').Client} client
 */
function applyPresence(client) {
  client.user.setPresence(buildPresence());
}

/**
 * Bio "À propos de moi" de l'application (≠ profil utilisateur).
 * @param {import('discord.js').Client} client
 * @param {?string} bio - null = bio vide
 */
async function applyBio(client, bio) {
  await client.application.edit({ description: bio ?? '' });
}

/**
 * Bannière du PROFIL du bot (Discord l'accepte pour les bots depuis 2024).
 * @param {import('discord.js').Client} client
 * @param {?string} url - null = retire la bannière
 */
async function applyBotBanner(client, url) {
  if (typeof client.user.setBanner !== 'function') {
    throw new Error('setBanner indisponible — mets à jour discord.js (≥ 14.16).');
  }
  await client.user.setBanner(url ?? null);
}

module.exports = {
  PROFILE_FIELDS,
  getBotProfile,
  applyProfileDraft,
  buildPresence,
  applyPresence,
  applyBio,
  applyBotBanner,
};
