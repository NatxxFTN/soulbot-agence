'use strict';

// ═══════════════════════════════════════════════
// SOULBOT RESPONSE BUILDER — v2.1.2
// Helper central des réponses standard.
// Toute nouvelle commande / commande upgradée passe par ce module
// pour garantir la cohérence visuelle (charte magenta + emojis custom).
//
// Emojis : on passe par bot/core/emojis.js (e/forButton) — jamais
// d'ID Discord en dur ici. Si l'emoji custom n'est pas uploadé,
// le fallback du module emojis s'applique.
// ═══════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { e, forButton } = require('../core/emojis');
const { version } = require('../../package.json');

// ─── Charte couleurs v2.1.2 — identité magenta Soulbot ───────────────────────
const COLORS = {
  primary : 0xB600A8,  // Magenta identitaire Soulbot
  success : 0x00C851,  // Vert confirmation
  error   : 0xFF3333,  // Rouge erreur / refus
  info    : 0x5865F2,  // Bleu information
  warning : 0xFF8800,  // Orange avertissement / action irréversible
};

// ─── Identité bot — initialisée après client.ready ───────────────────────────
// Même pattern que utils/embeds.js : le module est chargé avant la connexion,
// init() injecte l'avatar une fois client.user disponible (event ready).
let _botIdentity = { name: 'Soulbot', iconURL: null };

/**
 * À appeler UNE SEULE FOIS dans l'event ready.
 * @param {import('discord.js').ClientUser} clientUser
 */
function init(clientUser) {
  _botIdentity.name    = clientUser.username;
  _botIdentity.iconURL = clientUser.displayAvatarURL({ size: 64 });
}

/**
 * Footer standard Soulbot — version lue depuis package.json
 * pour ne jamais avoir de footer périmé après un bump.
 * @returns {{ text: string, iconURL: ?string }}
 */
function footer() {
  return { text: `Soulbot v${version}`, iconURL: _botIdentity.iconURL ?? undefined };
}

// ─── Factory de base ──────────────────────────────────────────────────────────

function base(color) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter(footer())
    .setTimestamp();
}

function applyFields(embed, fields) {
  if (Array.isArray(fields) && fields.length) embed.addFields(fields);
  return embed;
}

// ─── Embeds sémantiques ───────────────────────────────────────────────────────

/**
 * Embed de succès standard.
 * @param {string} title
 * @param {string} [description]
 * @param {Array<{name: string, value: string, inline?: boolean}>} [fields]
 */
function successEmbed(title, description, fields = []) {
  return applyFields(
    base(COLORS.success)
      .setTitle(`${e('btn_success')} ${title}`)
      .setDescription(description ?? null),
    fields,
  );
}

/**
 * Embed d'erreur standard.
 * @param {string} title
 * @param {string} [description]
 */
function errorEmbed(title, description) {
  // ui_alert et non btn_error : btn_error n'est pas uploadé dans le cache
  // emojis → son fallback serait un emoji Unicode (interdit).
  return base(COLORS.error)
    .setTitle(`${e('ui_alert')} ${title}`)
    .setDescription(description ?? null);
}

/**
 * Embed d'information standard.
 * @param {string} title
 * @param {string} [description]
 * @param {Array<{name: string, value: string, inline?: boolean}>} [fields]
 */
function infoEmbed(title, description, fields = []) {
  return applyFields(
    base(COLORS.info)
      .setTitle(`${e('btn_tip')} ${title}`)
      .setDescription(description ?? null),
    fields,
  );
}

/**
 * Embed d'avertissement — confirmation avant action irréversible.
 * @param {string} title
 * @param {string} [description]
 * @param {Array<{name: string, value: string, inline?: boolean}>} [fields]
 */
function warningEmbed(title, description, fields = []) {
  return applyFields(
    base(COLORS.warning)
      .setTitle(`${e('btn_flag')} ${title}`)
      .setDescription(description ?? null),
    fields,
  );
}

/**
 * Embed neutre couleur primaire (panels, stats, vitrine).
 * @param {string} [title]
 * @param {string} [description]
 * @param {Array<{name: string, value: string, inline?: boolean}>} [fields]
 */
function primaryEmbed(title, description, fields = []) {
  const embed = base(COLORS.primary).setDescription(description ?? null);
  if (title) embed.setTitle(title);
  return applyFields(embed, fields);
}

// ─── Composants ───────────────────────────────────────────────────────────────

/**
 * Row de confirmation standard (Confirmer = Danger, Annuler = Secondary).
 * @param {string} [confirmId]
 * @param {string} [cancelId]
 * @returns {ActionRowBuilder}
 */
function confirmRow(confirmId = 'confirm', cancelId = 'cancel') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel('Confirmer')
      .setEmoji(forButton('btn_success'))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Flow de confirmation complet : envoie l'avertissement avec boutons,
 * attend le clic du demandeur (30 s), gère annulation et timeout.
 * Centralisé ici pour que chaque commande destructive n'ait qu'à fournir
 * son embed d'avertissement et son callback d'exécution.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {EmbedBuilder} warnEmbed - embed décrivant l'action à confirmer
 * @param {(i: import('discord.js').ButtonInteraction) => Promise<void>} onConfirm
 * @param {{ timeoutMs?: number }} [opts]
 */
async function confirmFlow(interaction, warnEmbed, onConfirm, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const confirmId = `confirm_${interaction.id}`;
  const cancelId  = `cancel_${interaction.id}`;

  const method = (interaction.deferred || interaction.replied) ? 'editReply' : 'reply';
  const message = await interaction[method]({
    embeds: [warnEmbed],
    components: [confirmRow(confirmId, cancelId)],
    ephemeral: true,
    fetchReply: true,
  });

  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id
      && (i.customId === confirmId || i.customId === cancelId),
    time: timeoutMs,
    max: 1,
  });

  collector.on('collect', async (i) => {
    if (i.customId === confirmId) {
      await onConfirm(i);
    } else {
      await i.update({
        embeds: [infoEmbed('Annulé', 'Action annulée — rien n\'a été modifié.')],
        components: [],
      });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      interaction.editReply({
        embeds: [errorEmbed('Expiré', 'Confirmation expirée — action abandonnée.')],
        components: [],
      }).catch(() => { /* message supprimé entre-temps */ });
    }
  });
}

// ─── Pricing (source de vérité : bot/core/pricing.js) ───────────────────────

/**
 * Ligne de prix formatée pour un embed/panel — lit la DB en temps réel,
 * jamais de prix hardcodé dans une commande.
 * @param {string} tierId - 'fixed' | 'tier_basic' | 'tier_pro' | 'tier_premium'
 * @param {boolean} [isCurrent] - true si c'est le tier actif de l'utilisateur
 * @returns {string} ligne Markdown, '' si tier inconnu
 */
function formatPricingLine(tierId, isCurrent = false) {
  // require ici et non en tête de fichier : pricing.js require response-builder
  // pour ses logs — un require top-level créerait un cycle.
  const pricing = require('../core/pricing');
  const tier = pricing.getPricingById(tierId);
  if (!tier) return '';

  const current  = isCurrent ? ` ${e('btn_success')}` : '';
  const features = pricing.getFeaturesByTier(tierId);
  const featureStr = features.length ? `\n${e('btn_tip')} ${features.join(', ')}` : '';
  const price = tier.price_usd > 0 ? `$${tier.price_usd.toFixed(2)}` : 'Gratuit';

  return `**${tier.name}** — ${price}${current}${featureStr}`;
}

// ─── Mentions légales (Section 4) ────────────────────────────────────────────

/**
 * Footer des embeds pricing/config — version + identité Soulbot.
 * @returns {{ text: string, iconURL: ?string }}
 */
function legalFooter() {
  return {
    text   : `Soulbot v${version} — Tous droits réservés`,
    iconURL: _botIdentity.iconURL ?? undefined,
  };
}

/**
 * Champs ToS + Support réutilisables sur les embeds pricing/config.
 * URLs lues depuis .env (TOS_URL, SUPPORT_URL) — champ omis si non configuré.
 * @returns {Array<{name: string, value: string, inline: boolean}>}
 */
function legalFields() {
  const fields = [];
  if (process.env.TOS_URL) {
    fields.push({ name: 'Conditions d\'utilisation', value: `[Lire les ToS](${process.env.TOS_URL})`, inline: true });
  }
  if (process.env.SUPPORT_URL) {
    fields.push({ name: 'Support', value: `[Contacter](${process.env.SUPPORT_URL})`, inline: true });
  }
  return fields;
}

// ─── Logs publics ─────────────────────────────────────────────────────────────

/**
 * Ligne de log standard : [ACTION] user | détails | timestamp Discord.
 * @param {string} action - ex. 'BAN', 'CONFIG'
 * @param {import('discord.js').User|string} user
 * @param {string} details
 */
function logLine(action, user, details) {
  const ts = Math.floor(Date.now() / 1000);
  return `[${action}] ${user} | ${details} | <t:${ts}:f>`;
}

module.exports = {
  COLORS,
  init,
  footer,
  successEmbed,
  errorEmbed,
  infoEmbed,
  warningEmbed,
  primaryEmbed,
  confirmRow,
  confirmFlow,
  formatPricingLine,
  legalFooter,
  legalFields,
  logLine,
};
