'use strict';

const { EmbedBuilder } = require('discord.js');

// ─── Charte couleurs officielle — UI_UX_GUIDELINES.md §1.1 ───────────────────
//
// RÈGLE ABSOLUE : ces valeurs ne changent pas sans validation du Designer.
// Toute déviation de PRIMARY = 0xF39C12 est un refus de livraison immédiat.
// Référence : UI_UX_GUIDELINES.md §1.2 — "Pas notre orange → retour sans analyse"
//
const COLORS = {
  PRIMARY : 0xF39C12,  // Orange identitaire — SEULE couleur par défaut admise
  SUCCESS : 0x27AE60,  // Vert confirmation — action réussie, opération validée
  ERROR   : 0xE74C3C,  // Rouge erreur — refus, accès interdit, crash
  WARNING : 0xF1C40F,  // Jaune avertissement — action critique, irréversible imminente
  INFO    : 0x3498DB,  // Bleu information — aide, documentation, neutre
  GOLD    : 0xFFD700,  // Or starboard — récompense, mise en avant
  NEUTRAL : 0x95A5A6,  // Gris chargement — état intermédiaire, embed de transition
};

// ─── Identité bot — initialisée après client.ready ───────────────────────────
//
// POURQUOI un objet mutable et non un import direct du client :
// Ce module est chargé avant que client.ready soit émis. L'avatar du bot
// n'est disponible qu'après connexion. init() est appelé une fois dans ready.js
// pour injecter les données sans recréer le module.
//
let _botIdentity = {
  name    : 'Soulbot',  // Nom affiché dans setAuthor sur tous les embeds
  iconURL : null,        // URL avatar — null jusqu'à init(), Discord affiche sans icône
};

/**
 * Initialise l'identité du bot pour les embeds.
 * À appeler UNE SEULE FOIS dans l'event ready, après client.user est disponible.
 * @param {import('discord.js').ClientUser} clientUser
 */
function init(clientUser) {
  _botIdentity.name    = clientUser.username;
  _botIdentity.iconURL = clientUser.displayAvatarURL({ size: 64 });
}

// ─── Factory de base ──────────────────────────────────────────────────────────

/**
 * Embed de base : couleur + author + footer + timestamp.
 * STANDARD OBLIGATOIRE — tout embed produit par ce bot passe par base().
 *
 * POURQUOI setAuthor sur chaque embed :
 * L'author donne une signature visuelle immédiate. L'utilisateur identifie
 * le bot avant de lire le contenu — critique pour les serveurs avec plusieurs bots.
 *
 * POURQUOI setTimestamp sur chaque embed :
 * Un embed peut être consulté des heures après sa création. Le timestamp
 * ancre l'information dans le temps sans effort côté développeur.
 *
 * @param {number} color - Valeur hexadécimale depuis COLORS
 * @returns {EmbedBuilder}
 */
function base(color = COLORS.PRIMARY) {
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: _botIdentity.name, iconURL: _botIdentity.iconURL })
    .setFooter({ text: '+help pour la liste des commandes' })
    .setTimestamp();
}

// ─── Factories sémantiques ────────────────────────────────────────────────────

/**
 * Embed de succès — confirmation d'une action réussie.
 * @param {string} title
 * @param {string} [description]
 */
function success(title, description) {
  return base(COLORS.SUCCESS)
    .setTitle(`✓ ${title}`)   // ✓ sobre — pas ✅ emoji générique
    .setDescription(description ?? null);
}

/**
 * Embed d'erreur — refus, permission manquante, crash récupéré.
 * @param {string} title
 * @param {string} [description]
 */
function error(title, description) {
  return base(COLORS.ERROR)
    .setTitle(`✗ ${title}`)   // ✗ sobre — pas ❌ emoji générique
    .setDescription(description ?? null);
}

/**
 * Embed d'information neutre — aide, documentation, état.
 * @param {string} title
 * @param {string} [description]
 */
function info(title, description) {
  return base(COLORS.INFO)
    .setTitle(`ℹ ${title}`)
    .setDescription(description ?? null);
}

/**
 * Embed statistiques — données, classements, compteurs.
 * Couleur PRIMARY (#F39C12) — signature orange du bot.
 * @param {string} title
 * @param {string} [description]
 */
function stats(title, description) {
  return base(COLORS.PRIMARY)
    .setTitle(`📊 ${title}`)
    .setDescription(description ?? null);
}

/**
 * Embed d'avertissement — action irréversible imminente, seuil critique.
 * @param {string} title
 * @param {string} [description]
 */
function warning(title, description) {
  return base(COLORS.WARNING)
    .setTitle(`⚠ ${title}`)
    .setDescription(description ?? null);
}

/**
 * Embed d'usage — syntaxe d'une commande mal utilisée.
 * Couleur NEUTRAL pour indiquer qu'il ne s'agit pas d'une vraie erreur,
 * juste d'un guide d'utilisation.
 * @param {string} prefix
 * @param {string} usageStr
 * @param {string} [description]
 */
function usage(prefix, usageStr, description) {
  return base(COLORS.NEUTRAL)
    .setTitle('📌 Utilisation')
    .setDescription(`\`\`\`\n${prefix}${usageStr}\n\`\`\`${description ? `\n${description}` : ''}`);
}

/**
 * Embed starboard — mise en avant d'un message récompensé.
 * Couleur GOLD réservée exclusivement au starboard.
 * @param {string} [description]
 */
function gold(description) {
  return base(COLORS.GOLD)
    .setDescription(description ?? null);
}

module.exports = { COLORS, init, base, success, error, info, stats, warning, usage, gold };
