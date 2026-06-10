'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// EMOJIS CUSTOM — ServerForge × Soulbot
// ═══════════════════════════════════════════════════════════════════════════════
// ATTENTION : Aucun emoji Unicode n'est utilisé dans les noms de rôles, salons
// ou catégories générés par ServerForge. Seuls les emojis custom (uploadés sur
// le serveur Discord) sont autorisés.
//
// INSTRUCTIONS :
// 1. Va sur https://discotools.xyz/fr/icons-editor
// 2. Connecte-toi avec Discord (gratuit)
// 3. Crée chaque icône avec la couleur du thème (#8B5CF6)
// 4. Upload-les sur ton serveur Discord (Paramètres → Emojis)
// 5. Copie l'ID de chaque emoji (clic droit → "Copier l'identifiant")
// 6. Remplace REMPLACE_PAR_ID par l'ID réel ci-dessous
// ═══════════════════════════════════════════════════════════════════════════════

const EMOJIS = {
  // ── Catégories ──────────────────────────────────────────────────────────────
  /** Cloche — catégorie Important/Annonces */
  BELL: '<:bell:1512926879643074743>',
  /** Bulle de discussion — catégorie Général */
  CHAT: '<:chat:1512926887192694967>',
  /** Étoile — catégorie Animations/Events */
  STAR: '<:star:REMPLACE_PAR_ID>',
  /** Bouclier — catégorie Sécurité/Staff */
  SHIELD: '<:shield:REMPLACE_PAR_ID>',
  /** Statistiques — catégorie Logs */
  STATS: '<:stats:1512926894922662251>',

  // ── Rôles ───────────────────────────────────────────────────────────────────
  /** Couronne — rôle Fondateur */
  CROWN: '<:crown:1512926833203740932>',
  /** Éclair — rôle Admin */
  BOLT: '<:bolt:1512926841785155664>',
  /** Marteau — rôle Modérateur */
  HAMMER: '<:hammer:1512926849187971252>',
  /** Diamant — rôle VIP */
  GEM: '<:gem:1512926856658026661>',
  /** Checkmark — rôle Membre */
  CHECK: '<:check:1512926864501510294>',
  /** Robot — rôle BOTS */
  BOT: '<:bot:1512926871917035550>',

  // ── Salons ──────────────────────────────────────────────────────────────────
  /** Mégaphone — salon annonces */
  ANNOUNCE: '<:announce:1512926902338326718>',
  /** Livre — salon règlement */
  RULES: '<:rules:1512926909690810489>',
  /** Main qui salue — salon bienvenue */
  WELCOME: '<:welcome:1512926917387616377>',
  /** Note de musique — salon musique */
  MUSIC: '<:music:1512926925004345476>',
  /** Appareil photo — salon médias */
  MEDIA: '<:media:1512926932805877831>',

  // ── Logs ────────────────────────────────────────────────────────────────────
  /** Entrée/Sortie — salon joins-leaves */
  LOG_JOIN: '<:log_join:1512926941252948038>',
  /** Crayon — salon messages edit */
  LOG_EDIT: '<:log_edit:1512926949788487710>',
  /** Gavel — salon modération */
  LOG_MOD: '<:log_mod:1512926957195759778>',
  /** Engrenage — salon serveur */
  LOG_SETTINGS: '<:log_settings:1512926964800028873>',
  /** Micro — salon vocal */
  LOG_VOICE: '<:log_voice:1512926973549215834>',

  // ── UI / Boutons ────────────────────────────────────────────────────────────
  /** Checkmark verte — bouton confirmer */
  UI_CHECK: '<:ui_check:1512926981681971361>',
  /** Croix rouge — bouton annuler */
  UI_CROSS: '<:ui_cross:1512926989101568122>',
  /** Avertissement — bouton danger */
  UI_WARNING: '<:ui_warning:1512926996231884914>',
  /** Plus — ajouter */
  UI_PLUS: '<:ui_plus:1512927004075233404>',
  /** Moins — supprimer */
  UI_MINUS: '<:ui_minus:1512927011574911096>',
};

/**
 * Résout les placeholders {{NOM}} dans une chaîne en les remplaçant
 * par les emojis custom correspondants depuis ce fichier de config.
 *
 * @param {string} str - Chaîne contenant des placeholders {{NOM}}
 * @returns {string} Chaîne avec les emojis résolus (ou le placeholder intact si non configuré)
 *
 * @example
 * resolveEmojis('{{CROWN}} Fondateur')
 * // → '<:crown:1234567890> Fondateur'
 */
function resolveEmojis(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return EMOJIS[key] || match;
  });
}

module.exports = { EMOJIS, resolveEmojis };
