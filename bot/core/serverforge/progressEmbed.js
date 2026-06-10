'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS EMBED — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Embed de progression en temps réel pour la génération de serveur.
// Mis à jour à chaque étape via interaction.editReply().
//
// Style : violet #8B5CF6 — cohérent avec le thème ServerForge.
// ═══════════════════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const { THEME } = require('../../config/theme');

/**
 * Statut possible de chaque étape de la génération.
 * @enum {string}
 */
const StepStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Crée un embed de progression pour la génération.
 *
 * @param {object} options - Options de progression
 * @param {object} options.steps - État de chaque étape
 * @param {string} options.steps.roles - 'pending' | 'in_progress' | 'completed' | 'failed'
 * @param {string} options.steps.categories - 'pending' | 'in_progress' | 'completed' | 'failed'
 * @param {string} options.steps.channels - 'pending' | 'in_progress' | 'completed' | 'failed'
 * @param {string} options.steps.logs - 'pending' | 'in_progress' | 'completed' | 'failed'
 * @param {string} options.steps.messages - 'pending' | 'in_progress' | 'completed' | 'failed'
 * @param {object} options.counts - Compteurs pour chaque étape
 * @param {number} options.counts.roles - Rôles créés
 * @param {number} options.counts.rolesTotal - Total rôles à créer
 * @param {number} options.counts.categories - Catégories créées
 * @param {number} options.counts.categoriesTotal - Total catégories
 * @param {number} options.counts.channels - Salons créés
 * @param {number} options.counts.channelsTotal - Total salons
 * @param {number} options.counts.logs - Logs créés
 * @param {number} options.counts.logsTotal - Total logs
 * @param {number} options.elapsedSeconds - Temps écoulé depuis le début
 * @param {string} [options.statusMessage] - Message de statut supplémentaire
 * @returns {EmbedBuilder} L'embed de progression
 */
function createProgressEmbed(options) {
  const {
    steps = {},
    counts = {},
    elapsedSeconds = 0,
    statusMessage = '',
  } = options;

  const emoji = (status) => {
    switch (status) {
      case StepStatus.COMPLETED: return '✅';
      case StepStatus.IN_PROGRESS: return '⏳';
      case StepStatus.FAILED: return '❌';
      default: return '⬜';
    }
  };

  const progressBar = (current, total) => {
    if (!total || total === 0) return '░░░░░░░░░░ 0%';
    const filled = Math.round((current / total) * 10);
    const bar = '█'.repeat(Math.min(filled, 10)) + '░'.repeat(Math.max(0, 10 - filled));
    const pct = Math.round((current / total) * 100);
    return `${bar} ${pct}%`;
  };

  const formatCount = (current, total) => {
    if (total) {
      return `${current || 0}/${total}`;
    }
    return current ? `${current}` : '—';
  };

  const lines = [];

  // Rôles
  lines.push(
    `${emoji(steps.roles)} Roles ................ ${progressBar(counts.roles, counts.rolesTotal)} (${formatCount(counts.roles, counts.rolesTotal)})`
  );

  // Catégories
  lines.push(
    `${emoji(steps.categories)} Categories ........... ${progressBar(counts.categories, counts.categoriesTotal)} (${formatCount(counts.categories, counts.categoriesTotal)})`
  );

  // Salons
  lines.push(
    `${emoji(steps.channels)} Salons ............... ${progressBar(counts.channels, counts.channelsTotal)} (${formatCount(counts.channels, counts.channelsTotal)})`
  );

  // Logs
  lines.push(
    `${emoji(steps.logs)} Logs .................. ${progressBar(counts.logs, counts.logsTotal)} (${formatCount(counts.logs, counts.logsTotal)})`
  );

  // Messages
  lines.push(
    `${emoji(steps.messages)} Messages ............. ${progressBar(counts.messages || 0, counts.messagesTotal || 0)} (${formatCount(counts.messages, counts.messagesTotal)})`
  );

  // Temps écoulé
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  const embed = new EmbedBuilder()
    .setColor(steps.messages === StepStatus.FAILED || steps.roles === StepStatus.FAILED
      ? THEME.COLOR_ERROR
      : THEME.COLOR_PRIMARY)
    .setTitle(`${THEME.ICONS.SERVERFORGE} ServerForge — Generation en cours`)
    .setDescription(lines.join('\n'))
    .addFields(
      { name: '⏱️ Temps ecoule', value: `\`${timeStr}\``, inline: true },
    )
    .setFooter({ text: THEME.FOOTER_TEXT })
    .setTimestamp();

  if (statusMessage) {
    embed.addFields({ name: 'ℹ️ Statut', value: statusMessage, inline: false });
  }

  return embed;
}

/**
 * Crée l'embed de progression initial pour lancer /generate.
 *
 * @param {object} totalCounts - Totaux estimés
 * @param {number} totalCounts.rolesTotal - Nombre de rôles à créer
 * @param {number} totalCounts.categoriesTotal - Nombre de catégories à créer
 * @param {number} totalCounts.channelsTotal - Nombre de salons à créer
 * @param {number} totalCounts.logsTotal - Nombre de salons de logs à créer
 * @returns {EmbedBuilder} L'embed initial
 */
function createInitialProgressEmbed(totalCounts) {
  return createProgressEmbed({
    steps: {
      roles: StepStatus.PENDING,
      categories: StepStatus.PENDING,
      channels: StepStatus.PENDING,
      logs: StepStatus.PENDING,
      messages: StepStatus.PENDING,
    },
    counts: {
      roles: 0,
      rolesTotal: totalCounts.rolesTotal || 0,
      categories: 0,
      categoriesTotal: totalCounts.categoriesTotal || 0,
      channels: 0,
      channelsTotal: totalCounts.channelsTotal || 0,
      logs: 0,
      logsTotal: totalCounts.logsTotal || 0,
      messages: 0,
      messagesTotal: totalCounts.messagesTotal || 0,
    },
    elapsedSeconds: 0,
    statusMessage: 'Initialisation...',
  });
}

/**
 * Crée l'embed de succès final après une génération réussie.
 *
 * @param {object} results - Résultats de la génération
 * @param {number} results.roles - Rôles créés
 * @param {number} results.categories - Catégories créées
 * @param {number} results.channels - Salons créés
 * @param {number} results.logs - Salons de logs créés
 * @param {number} results.messages - Messages envoyés
 * @param {number} results.elapsedSeconds - Temps total écoulé
 * @param {number} [results.errors] - Nombre d'erreurs
 * @returns {EmbedBuilder} L'embed de succès
 */
function createFinalSuccessEmbed(results) {
  const minutes = Math.floor(results.elapsedSeconds / 60);
  const seconds = results.elapsedSeconds % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const hasErrors = results.errors > 0;

  const description = [
    `**Roles crees :** ${results.roles}`,
    `**Categories :** ${results.categories}`,
    `**Salons crees :** ${results.channels}`,
    `**Logs crees :** ${results.logs}`,
    `**Messages :** ${results.messages}`,
    '',
    `⏱️ Duree : \`${timeStr}\``,
  ];

  if (hasErrors) {
    description.push('', `⚠️ **${results.errors}** erreur(s) — voir les logs pour les details`);
  }

  return new EmbedBuilder()
    .setColor(hasErrors ? THEME.COLOR_WARNING : THEME.COLOR_SUCCESS)
    .setTitle(hasErrors
      ? `${THEME.ICONS.WARNING} ServerForge — Generation partielle`
      : `${THEME.ICONS.SUCCESS} ServerForge — Generation terminee`)
    .setDescription(description.join('\n'))
    .setFooter({ text: THEME.FOOTER_TEXT })
    .setTimestamp();
}

/**
 * Crée l'embed d'erreur pour une génération échouée.
 *
 * @param {string} errorMessage - Message d'erreur
 * @param {number} [elapsedSeconds] - Temps écoulé avant l'erreur
 * @returns {EmbedBuilder} L'embed d'erreur
 */
function createErrorEmbed(errorMessage, elapsedSeconds = 0) {
  const timeStr = elapsedSeconds > 0
    ? `\n\n⏱️ Duree avant l'erreur : \`${elapsedSeconds}s\``
    : '';

  return new EmbedBuilder()
    .setColor(THEME.COLOR_ERROR)
    .setTitle(`${THEME.ICONS.ERROR} ServerForge — Erreur`)
    .setDescription(`\`\`\`\n${errorMessage}\n\`\`\`${timeStr}`)
    .setFooter({ text: THEME.FOOTER_TEXT })
    .setTimestamp();
}

module.exports = {
  StepStatus,
  createProgressEmbed,
  createInitialProgressEmbed,
  createFinalSuccessEmbed,
  createErrorEmbed,
};
