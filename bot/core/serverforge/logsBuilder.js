'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// LOGS BUILDER — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Crée la catégorie et les salons de logs, puis route les événements Discord
// via la table guild_log_routing (Logs V3 Ultimate — héritée de Soulbot).
// ═══════════════════════════════════════════════════════════════════════════════

const { ChannelType, PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const logger = require('../../utils/logger');
const { safeCreate } = require('./rateLimit');
const { resolveEmojis } = require('../../config/emojis');

/**
 * Crée le système de logs : catégorie dédiée + salons de logs + routage SQLite.
 *
 * @param {import('discord.js').Guild} guild - La guilde Discord
 * @param {object} template - Le template chargé
 * @param {object} roleMap - Map des noms de rôles → IDs (depuis roleBuilder)
 * @param {Function} [progressCallback] - Fonction de progression
 * @returns {Promise<{logMap: object, categoryId: string|null, errors: string[]}>}
 *   logMap: { 'arrives-departs': 'channel_id', 'messages': 'channel_id', ... }
 *   categoryId: ID de la catégorie logs créée
 */
async function createLogs(guild, template, roleMap, progressCallback = () => {}) {
  const logMap = {};
  const errors = [];
  let categoryId = null;

  // Vérifie si les logs sont activés
  if (!template.logs || !template.logs.enabled) {
    progressCallback({
      type: 'logs',
      status: 'completed',
      current: 0,
      total: 0,
      message: 'Logs désactivés dans le template',
    });
    return { logMap, categoryId: null, errors };
  }

  const logConfig = template.logs;
  const totalLogChannels = (logConfig.channels || []).length;

  progressCallback({
    type: 'logs',
    status: 'in_progress',
    current: 0,
    total: totalLogChannels,
    message: `Création des logs (0/${totalLogChannels})...`,
  });

  // 1. Crée la catégorie logs
  const categoryName = resolveEmojis(logConfig.category_name || '-·📊·- Logs');
  try {
    const category = await safeCreate(
      () => guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        reason: 'ServerForge — Système de logs',
      }),
      `Catégorie logs "${categoryName}"`,
      { baseDelay: 400 }
    );
    categoryId = category.id;
    logger.info('ServerForge:LogsBuilder', `Catégorie logs créée: "${categoryName}" (${category.id})`);
  } catch (err) {
    const errorMsg = `Catégorie logs "${categoryName}": ${err.message}`;
    errors.push(errorMsg);
    logger.error('ServerForge:LogsBuilder', errorMsg);
    return { logMap, categoryId: null, errors };
  }

  // 2. Crée les salons de logs et route les événements
  let logsCreated = 0;

  // Permissions : seuls les admins/modos voient les logs (par défaut)
  const everyoneOverwrite = { id: guild.roles.everyone.id, type: 'role', deny: PermissionsBitField.Flags.ViewChannel, allow: 0n };
  const baseOverwrites = [everyoneOverwrite];

  // Ajoute les modérateurs/admins aux permissions si trouvés
  for (const [roleName, roleId] of Object.entries(roleMap)) {
    const lower = roleName.toLowerCase();
    if (lower.includes('fondateur') || lower.includes('admin') || lower.includes('mod') || lower.includes('staff')) {
      baseOverwrites.push({
        id: roleId,
        type: 'role',
        allow: PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.ReadMessageHistory | PermissionsBitField.Flags.SendMessages,
        deny: 0n,
      });
    }
  }

  for (const chConfig of logConfig.channels || []) {
    const channelName = resolveEmojis(chConfig.name);

    try {
      const channel = await safeCreate(
        () => guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: categoryId,
          topic: chConfig.topic || `Logs — ${chConfig.events.join(', ')}`,
          permissionOverwrites: baseOverwrites,
          reason: 'ServerForge — Système de logs',
        }),
        `Salon logs "${channelName}"`,
        { baseDelay: 350 }
      );

      // Stocke le salon par référence
      logMap[chConfig.name] = channel.id;

      // Enregistre le routage dans la base SQLite (Logs V3 Ultimate)
      const eventTypes = Array.isArray(chConfig.events) ? chConfig.events : [];
      for (const eventType of eventTypes) {
        try {
          db.prepare(`
            INSERT OR REPLACE INTO guild_log_routing (guild_id, event_type, channel_id)
            VALUES (?, ?, ?)
          `).run(guild.id, eventType, channel.id);
        } catch (dbErr) {
          logger.error('ServerForge:LogsBuilder',
            `Erreur routage DB pour "${eventType}": ${dbErr.message}`
          );
        }
      }

      // Active la configuration globale des logs si elle n'existe pas
      try {
        db.prepare(`
          INSERT OR IGNORE INTO guild_log_config (guild_id, version, global_enabled)
          VALUES (?, 'v3', 1)
        `).run(guild.id);
      } catch { /* déjà existant */ }

      logsCreated++;
      logger.info('ServerForge:LogsBuilder',
        `Salon logs créé: "${channelName}" → ${eventTypes.length} événement(s) routé(s)`
      );

      progressCallback({
        type: 'logs',
        status: 'in_progress',
        current: logsCreated,
        total: totalLogChannels,
        message: `Logs: ${logsCreated}/${totalLogChannels}`,
      });
    } catch (err) {
      const errorMsg = `Salon logs "${channelName}": ${err.message}`;
      errors.push(errorMsg);
      logger.error('ServerForge:LogsBuilder', errorMsg);

      logsCreated++;
      progressCallback({
        type: 'logs',
        status: 'in_progress',
        current: logsCreated,
        total: totalLogChannels,
        message: `Logs: ${logsCreated}/${totalLogChannels}`,
      });
    }
  }

  progressCallback({
    type: 'logs',
    status: errors.length > 0 && logsCreated === 0 ? 'failed' : 'completed',
    current: logsCreated,
    total: totalLogChannels,
    message: `${logsCreated} salons de logs créés`,
  });

  return { logMap, categoryId, errors };
}

module.exports = { createLogs };
