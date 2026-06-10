'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR — ServerForge Orchestrateur Principal
// ═══════════════════════════════════════════════════════════════════════════════
// Cerveau de ServerForge. Exécute le pipeline complet de génération dans l'ordre :
//   1. Reset (optionnel) — supprime tout ce qui existe
//   2. Rôles — roleBuilder.js
//   3. Catégories + Salons — channelBuilder.js
//   4. Logs — logsBuilder.js
//   5. Messages de bienvenue + règlement — welcomeBuilder.js
//
// Chaque étape est tracée avec une barre de progression temps réel.
// ═══════════════════════════════════════════════════════════════════════════════

const { PermissionsBitField, ChannelType } = require('discord.js');
const { db } = require('../../database');
const logger = require('../../utils/logger');
const { delay } = require('./rateLimit');
const { validateTemplate } = require('./templateValidator');
const { createRoles } = require('./roleBuilder');
const { createChannels } = require('./channelBuilder');
const { createLogs } = require('./logsBuilder');
const { sendWelcomeMessages } = require('./welcomeBuilder');
const {
  StepStatus,
  createProgressEmbed,
  createInitialProgressEmbed,
  createFinalSuccessEmbed,
  createErrorEmbed,
} = require('./progressEmbed');
const { THEME } = require('../../config/theme');

/**
 * Pipeline complet de génération de serveur.
 *
 * @param {import('discord.js').Guild} guild - La guilde à configurer
 * @param {object} template - Le template chargé et validé
 * @param {import('discord.js').CommandInteraction} interaction - L'interaction pour les réponses
 * @param {object} [options] - Options supplémentaires
 * @param {string} [options.name] - Surcharge du nom du serveur
 * @param {boolean} [options.reset] - Supprimer tout avant de générer
 * @returns {Promise<{success: boolean, stats: object, errors: string[]}>}
 */
async function generateServer(guild, template, interaction, options = {}) {
  const startTime = Date.now();
  const stats = {
    rolesCreated: 0,
    categoriesCreated: 0,
    channelsCreated: 0,
    logsCreated: 0,
    messagesSent: 0,
    errors: 0,
    totalErrors: 0,
  };
  const allErrors = [];

  // ── Validation du template ────────────────────────────────────────────────
  const validationErrors = validateTemplate(template);
  if (validationErrors.length > 0) {
    const errorMsg = validationErrors.join('\n');
    try {
      await interaction.editReply({
        embeds: [createErrorEmbed(`Template invalide:\n${errorMsg}`, 0)],
      });
    } catch { /* interaction expirée */ }
    await logGeneration(guild, template, interaction.user.id, stats, false, errorMsg);
    return { success: false, stats, errors: validationErrors };
  }

  // Surcharge le nom du serveur si fourni
  if (options.name) {
    template.meta = template.meta || {};
    template.meta.name = options.name;
  }

  // Calcule les totaux pour la barre de progression
  const totalCounts = {
    rolesTotal: template.roles?.length || 0,
    categoriesTotal: template.categories?.length || 0,
    channelsTotal: template.categories?.reduce((s, c) => s + (c.channels?.length || 0), 0) || 0,
    logsTotal: (template.logs?.channels?.length || 0),
    messagesTotal: 2, // welcome + rules
  };

  try {
    await interaction.editReply({
      embeds: [createInitialProgressEmbed(totalCounts)],
    });
  } catch { /* interaction expirée */ }

  // ── ÉTAPE 0 : Reset (optionnel) ───────────────────────────────────────────
  if (options.reset) {
    try {
      await interaction.editReply({
        embeds: [createProgressEmbed({
          steps: {
            roles: StepStatus.PENDING,
            categories: StepStatus.PENDING,
            channels: StepStatus.PENDING,
            logs: StepStatus.PENDING,
            messages: StepStatus.PENDING,
          },
          counts: totalCounts,
          elapsedSeconds: elapsed(startTime),
          statusMessage: '🗑️ Suppression des éléments existants...',
        })],
      });
    } catch { /* ignoré */ }

    const resetResult = await resetGuild(guild, (msg) => {
      // Progression du reset
      try {
        interaction.editReply({
          embeds: [createProgressEmbed({
            steps: {
              roles: StepStatus.IN_PROGRESS,
              categories: StepStatus.IN_PROGRESS,
              channels: StepStatus.IN_PROGRESS,
              logs: StepStatus.PENDING,
              messages: StepStatus.PENDING,
            },
            counts: totalCounts,
            elapsedSeconds: elapsed(startTime),
            statusMessage: msg,
          })],
        });
      } catch { /* ignoré */ }
    });

    if (resetResult.errors.length > 0) {
      allErrors.push(...resetResult.errors);
      stats.totalErrors += resetResult.errors.length;
    }
  }

  // ── ÉTAPE 1 : Rôles ──────────────────────────────────────────────────────
  let roleMap = {};
  try {
    const result = await createRoles(guild, template, (progress) => {
      updateProgress(interaction, startTime, totalCounts, 'roles', progress, stats);
    });

    roleMap = result.roleMap;
    stats.rolesCreated = Object.keys(roleMap).length;

    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
      stats.totalErrors += result.errors.length;
    }

    logger.info('ServerForge:Generator',
      `Étape rôles: ${stats.rolesCreated} créés, ${result.errors.length} erreur(s)`
    );
  } catch (err) {
    const errorMsg = `Erreur critique rôles: ${err.message}`;
    allErrors.push(errorMsg);
    stats.totalErrors++;
    logger.error('ServerForge:Generator', errorMsg);
  }

  // ── ÉTAPE 2 : Catégories + Salons ─────────────────────────────────────────
  let channelMap = {};
  let welcomeChannel = null;
  let rulesChannel = null;
  try {
    const result = await createChannels(guild, template, roleMap, (progress) => {
      updateProgress(interaction, startTime, totalCounts, 'channels', progress, stats);
    });

    channelMap = result.channelMap || {};
    stats.channelsCreated = Object.keys(channelMap).length;
    stats.categoriesCreated = Object.keys(result.categoryMap || {}).length;
    welcomeChannel = result.welcomeChannel;
    rulesChannel = result.rulesChannel;

    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
      stats.totalErrors += result.errors.length;
    }

    logger.info('ServerForge:Generator',
      `Étape salons: ${stats.channelsCreated} salons, ${stats.categoriesCreated} catégories, ${result.errors.length} erreur(s)`
    );
  } catch (err) {
    const errorMsg = `Erreur critique salons: ${err.message}`;
    allErrors.push(errorMsg);
    stats.totalErrors++;
    logger.error('ServerForge:Generator', errorMsg);
  }

  // ── ÉTAPE 3 : Logs ───────────────────────────────────────────────────────
  try {
    const result = await createLogs(guild, template, roleMap, (progress) => {
      updateProgress(interaction, startTime, totalCounts, 'logs', progress, stats);
    });

    stats.logsCreated = Object.keys(result.logMap || {}).length;

    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
      stats.totalErrors += result.errors.length;
    }

    logger.info('ServerForge:Generator',
      `Étape logs: ${stats.logsCreated} salons, ${result.errors.length} erreur(s)`
    );
  } catch (err) {
    const errorMsg = `Erreur critique logs: ${err.message}`;
    allErrors.push(errorMsg);
    stats.totalErrors++;
    logger.error('ServerForge:Generator', errorMsg);
  }

  // ── ÉTAPE 4 : Messages (bienvenue + règlement) ───────────────────────────
  try {
    const result = await sendWelcomeMessages(guild, template, { welcomeChannel, rulesChannel }, (progress) => {
      updateProgress(interaction, startTime, totalCounts, 'messages', progress, stats);
    });

    stats.messagesSent = result.messagesSent;

    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
      stats.totalErrors += result.errors.length;
    }

    logger.info('ServerForge:Generator',
      `Étape messages: ${stats.messagesSent} envoyés, ${result.errors.length} erreur(s)`
    );
  } catch (err) {
    const errorMsg = `Erreur critique messages: ${err.message}`;
    allErrors.push(errorMsg);
    stats.totalErrors++;
    logger.error('ServerForge:Generator', errorMsg);
  }

  // ── FIN : Rapport final ──────────────────────────────────────────────────
  const totalTime = elapsed(startTime);
  const finalSuccess = stats.totalErrors === 0 || stats.rolesCreated > 0;

  try {
    const finalEmbed = stats.totalErrors === 0
      ? createFinalSuccessEmbed({
          roles: stats.rolesCreated,
          categories: stats.categoriesCreated,
          channels: stats.channelsCreated,
          logs: stats.logsCreated,
          messages: stats.messagesSent,
          elapsedSeconds: totalTime,
          errors: 0,
        })
      : createFinalSuccessEmbed({
          roles: stats.rolesCreated,
          categories: stats.categoriesCreated,
          channels: stats.channelsCreated,
          logs: stats.logsCreated,
          messages: stats.messagesSent,
          elapsedSeconds: totalTime,
          errors: stats.totalErrors,
        });

    await interaction.editReply({ embeds: [finalEmbed] });
  } catch { /* interaction expirée */ }

  // ── Log en base de données ────────────────────────────────────────────────
  await logGeneration(
    guild,
    template,
    interaction.user.id,
    stats,
    finalSuccess,
    allErrors.length > 0 ? allErrors.slice(0, 5).join('; ') : null
  );

  return {
    success: finalSuccess,
    stats,
    errors: allErrors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET — Supprime tout le contenu du serveur
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supprime tous les salons, rôles et emojis du serveur.
 * Préserve @everyone et le rôle du bot.
 *
 * @param {import('discord.js').Guild} guild - La guilde à réinitialiser
 * @param {Function} [progressCallback] - Fonction de progression
 * @returns {Promise<{deleted: number, errors: string[]}>}
 */
async function resetGuild(guild, progressCallback = () => {}) {
  const errors = [];
  let deleted = 0;

  progressCallback('🗑️ Suppression des salons...');

  // Suppression des salons (par lots pour éviter rate-limit)
  const channels = Array.from(guild.channels.cache.values()).filter(c => c.deletable);
  for (const ch of channels) {
    try {
      await ch.delete('ServerForge — Reset');
      deleted++;
      await delay(250);
    } catch (err) {
      errors.push(`Salon "${ch.name}": ${err.message}`);
    }
  }

  progressCallback('🗑️ Suppression des rôles...');

  // Suppression des rôles (sauf @everyone, rôles gérés, et rôle du bot)
  const botRole = guild.members.me?.roles?.botRole;
  const roles = Array.from(guild.roles.cache.values())
    .filter(r => r.editable && !r.managed && r.id !== guild.roles.everyone.id && (!botRole || r.id !== botRole.id));

  for (const role of roles) {
    try {
      await role.delete('ServerForge — Reset');
      deleted++;
      await delay(300);
    } catch (err) {
      errors.push(`Rôle "${role.name}": ${err.message}`);
    }
  }

  progressCallback('🗑️ Suppression des emojis...');

  // Suppression des emojis
  for (const emoji of guild.emojis.cache.values()) {
    try {
      await emoji.delete('ServerForge — Reset');
      await delay(400);
    } catch { /* ignoré — pas de permissions */ }
  }

  return { deleted, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le temps écoulé en secondes depuis un timestamp.
 * @param {number} startTime - Timestamp de début (Date.now())
 * @returns {number} Secondes écoulées
 */
function elapsed(startTime) {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Met à jour l'embed de progression via l'interaction.
 *
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {number} startTime
 * @param {object} totalCounts
 * @param {string} stepType - 'roles' | 'channels' | 'logs' | 'messages'
 * @param {object} progress - Objet progression depuis le builder
 * @param {object} stats - Statistiques accumulées
 */
function updateProgress(interaction, startTime, totalCounts, stepType, progress, stats) {
  // Construit l'état courant des étapes
  const steps = {
    roles: stats.rolesCreated > 0 ? StepStatus.COMPLETED : StepStatus.PENDING,
    categories: stats.categoriesCreated > 0 ? StepStatus.COMPLETED : StepStatus.PENDING,
    channels: stats.channelsCreated > 0 ? StepStatus.COMPLETED : StepStatus.PENDING,
    logs: stats.logsCreated > 0 ? StepStatus.COMPLETED : StepStatus.PENDING,
    messages: stats.messagesSent > 0 ? StepStatus.COMPLETED : StepStatus.PENDING,
  };

  // Met à jour l'étape courante
  if (progress && progress.status) {
    if (stepType === 'roles' && progress.status === 'in_progress') steps.roles = StepStatus.IN_PROGRESS;
    else if (stepType === 'roles' && progress.status === 'completed') steps.roles = StepStatus.COMPLETED;
    else if (stepType === 'roles' && progress.status === 'failed') steps.roles = StepStatus.FAILED;

    if (stepType === 'channels') {
      if (progress.status === 'in_progress') {
        steps.channels = StepStatus.IN_PROGRESS;
        steps.categories = StepStatus.IN_PROGRESS;
      } else if (progress.status === 'completed') {
        steps.channels = StepStatus.COMPLETED;
        steps.categories = StepStatus.COMPLETED;
      } else if (progress.status === 'failed') {
        steps.channels = StepStatus.FAILED;
      }
    }

    if (stepType === 'logs') {
      steps.logs = progress.status === 'in_progress' ? StepStatus.IN_PROGRESS
        : progress.status === 'completed' ? StepStatus.COMPLETED
        : StepStatus.FAILED;
    }

    if (stepType === 'messages') {
      steps.messages = progress.status === 'in_progress' ? StepStatus.IN_PROGRESS
        : progress.status === 'completed' ? StepStatus.COMPLETED
        : StepStatus.FAILED;
    }
  }

  // Prépare les compteurs pour l'embed
  const counts = {
    roles: stats.rolesCreated || 0,
    rolesTotal: totalCounts.rolesTotal || 0,
    categories: stats.categoriesCreated || 0,
    categoriesTotal: totalCounts.categoriesTotal || 0,
    channels: stats.channelsCreated || 0,
    channelsTotal: totalCounts.channelsTotal || 0,
    logs: stats.logsCreated || 0,
    logsTotal: totalCounts.logsTotal || 0,
    messages: stats.messagesSent || 0,
    messagesTotal: totalCounts.messagesTotal || 0,
  };

  try {
    interaction.editReply({
      embeds: [createProgressEmbed({
        steps,
        counts,
        elapsedSeconds: elapsed(startTime),
        statusMessage: progress ? progress.message : '',
      })],
    });
  } catch { /* interaction expirée — on continue la génération malgré tout */ }
}

/**
 * Enregistre la génération dans la table serverforge_generations.
 *
 * @param {import('discord.js').Guild} guild
 * @param {object} template
 * @param {string} userId
 * @param {object} stats
 * @param {boolean} success
 * @param {string|null} errorDetails
 */
function logGeneration(guild, template, userId, stats, success, errorDetails) {
  try {
    db.prepare(`
      INSERT INTO serverforge_generations
        (guild_id, guild_name, template_used, generated_by,
         roles_created, channels_created, logs_created, success, error_details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guild.id,
      guild.name,
      template.meta?.name || 'default',
      userId,
      stats.rolesCreated || 0,
      stats.channelsCreated || 0,
      stats.logsCreated || 0,
      success ? 1 : 0,
      errorDetails || null
    );
    logger.info('ServerForge:Generator', 'Génération enregistrée en base de données');
  } catch (err) {
    logger.error('ServerForge:Generator', `Erreur log DB: ${err.message}`);
  }
}

/**
 * Récupère la dernière génération pour une guilde.
 *
 * @param {string} guildId - ID de la guilde
 * @returns {object|null} Dernière génération ou null
 */
function getLastGeneration(guildId) {
  try {
    return db.prepare(`
      SELECT * FROM serverforge_generations
      WHERE guild_id = ?
      ORDER BY generated_at DESC
      LIMIT 1
    `).get(guildId);
  } catch (err) {
    logger.error('ServerForge:Generator', `Erreur lecture DB: ${err.message}`);
    return null;
  }
}

module.exports = { generateServer, resetGuild, getLastGeneration };
