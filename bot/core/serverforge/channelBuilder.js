'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL BUILDER — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Crée les catégories et salons depuis le template, dans l'ordre.
// Applique : topics, slowmode, nsfw, bitrate, userLimit, permissions par rôle.
// ═══════════════════════════════════════════════════════════════════════════════

const { ChannelType, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');
const { safeCreate } = require('./rateLimit');
const { resolveEmojis } = require('../../config/emojis');

// ─── Map des types de salons ─────────────────────────────────────────────────
const CHANNEL_TYPE_MAP = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  announcement: ChannelType.GuildAnnouncement,
  forum: ChannelType.GuildForum,
  stage: ChannelType.GuildStageVoice,
};

/**
 * Convertit un tableau de noms de permissions en bigint.
 * @param {string[]} permNames - Noms des permissions
 * @returns {bigint} Permissions combinées
 */
function parsePermissions(permNames) {
  if (!Array.isArray(permNames) || permNames.length === 0) return 0n;
  let bits = 0n;
  for (const name of permNames) {
    if (PermissionsBitField.Flags[name]) {
      bits |= PermissionsBitField.Flags[name];
    } else {
      logger.warn('ServerForge:ChannelBuilder', `Permission inconnue ignorée: "${name}"`);
    }
  }
  return bits;
}

/**
 * Construit les permission overwrites pour un salon à partir du template.
 *
 * @param {object} permissions - Objet permissions du template
 *   Ex: { "everyone": ["ViewChannel"], "Admin": ["ViewChannel", "SendMessages"] }
 * @param {object} roleMap - Map des noms de rôles → IDs
 *   Ex: { "Admin": "123456", "Membres": "789012" }
 * @param {import('discord.js').Guild} guild - La guilde (pour @everyone)
 * @returns {Array<{id: string, type: 'role', allow: bigint, deny: bigint}>}
 */
function buildPermissionOverwrites(permissions, roleMap, guild) {
  const overwrites = [];

  if (!permissions || typeof permissions !== 'object') return overwrites;

  for (const [roleName, perms] of Object.entries(permissions)) {
    let roleId;
    let isEveryone = false;

    if (roleName === 'everyone') {
      roleId = guild.roles.everyone.id;
      isEveryone = true;
    } else {
      roleId = roleMap[roleName];
      if (!roleId) {
        logger.warn('ServerForge:ChannelBuilder',
          `Rôle "${roleName}" non trouvé dans roleMap pour les permissions`
        );
        continue;
      }
    }

    // Pour @everyone : on DENY tout ce qui n'est pas explicitement autorisé
    // Pour les autres rôles : on ALLOW ce qui est listé
    if (isEveryone) {
      // @everyone reçoit uniquement les permissions listées en allow
      // Le reste est refusé par défaut pour les salons privés
      const allow = parsePermissions(perms);
      const deny = 0n; // On ne deny pas explicitement, on permet juste
      overwrites.push({ id: roleId, type: 'role', allow, deny });
    } else {
      const allow = parsePermissions(perms);
      overwrites.push({ id: roleId, type: 'role', allow, deny: 0n });
    }
  }

  return overwrites;
}

/**
 * Crée les catégories et salons depuis le template.
 *
 * @param {import('discord.js').Guild} guild - La guilde Discord
 * @param {object} template - Le template chargé
 * @param {object} roleMap - Map des noms de rôles → IDs (depuis roleBuilder)
 * @param {Function} [progressCallback] - Fonction de progression
 * @returns {Promise<{categoryMap: object, channelMap: object, welcomeChannel: string|null, rulesChannel: string|null, errors: string[]}>}
 *   categoryMap: { 'NomCatégorie': 'cat_id' }
 *   channelMap: { 'nom-salon': 'channel_id' }
 *   welcomeChannel: ID du salon de bienvenue (si trouvé)
 *   rulesChannel: ID du salon de règlement (si trouvé)
 */
async function createChannels(guild, template, roleMap, progressCallback = () => {}) {
  const categoryMap = {};
  const channelMap = {};
  let welcomeChannel = null;
  let rulesChannel = null;
  const errors = [];

  // Tri des catégories par position
  const sortedCategories = [...template.categories].sort((a, b) => (a.position || 0) - (b.position || 0));

  // Calcule le total des salons (pour la progression)
  let totalChannels = 0;
  for (const cat of sortedCategories) {
    totalChannels += (cat.channels || []).length;
  }

  let channelsCreated = 0;

  progressCallback({
    type: 'channels',
    status: 'in_progress',
    current: 0,
    total: totalChannels,
    message: `Création des salons (0/${totalChannels})...`,
  });

  for (const catConfig of sortedCategories) {
    const categoryName = resolveEmojis(catConfig.name);
    let category = null;

    // 1. Crée la catégorie
    try {
      category = await safeCreate(
        () => guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
          reason: 'ServerForge — Génération de serveur',
        }),
        `Catégorie "${categoryName}"`,
        { baseDelay: 400 }
      );

      categoryMap[catConfig.name] = category.id;
      logger.info('ServerForge:ChannelBuilder', `Catégorie créée: "${categoryName}" (${category.id})`);

      progressCallback({
        type: 'categories',
        status: 'in_progress',
        current: Object.keys(categoryMap).length,
        total: sortedCategories.length,
        message: `Catégories: ${Object.keys(categoryMap).length}/${sortedCategories.length}`,
      });
    } catch (err) {
      const errorMsg = `Catégorie "${categoryName}": ${err.message}`;
      errors.push(errorMsg);
      logger.error('ServerForge:ChannelBuilder', errorMsg);
      continue; // On skip les salons de cette catégorie si la catégorie a échoué
    }

    // 2. Crée les salons dans la catégorie
    for (const chConfig of catConfig.channels || []) {
      const channelName = resolveEmojis(chConfig.name);
      const channelType = CHANNEL_TYPE_MAP[chConfig.type] || ChannelType.GuildText;

      try {
        const options = {
          name: channelName,
          type: channelType,
          parent: category.id,
          reason: 'ServerForge — Génération de serveur',
        };

        // Options spécifiques selon le type
        if (chConfig.topic && channelType !== ChannelType.GuildVoice) {
          options.topic = chConfig.topic;
        }
        if (chConfig.slowmode && chConfig.slowmode > 0) {
          options.rateLimitPerUser = chConfig.slowmode;
        }
        if (chConfig.nsfw) {
          options.nsfw = true;
        }
        if (chConfig.bitrate && (channelType === ChannelType.GuildVoice || channelType === ChannelType.GuildStageVoice)) {
          options.bitrate = chConfig.bitrate;
        }
        if (chConfig.userLimit && (channelType === ChannelType.GuildVoice || channelType === ChannelType.GuildStageVoice)) {
          options.userLimit = chConfig.userLimit;
        }

        // Permission overwrites
        if (chConfig.permissions) {
          options.permissionOverwrites = buildPermissionOverwrites(chConfig.permissions, roleMap, guild);
        }

        const channel = await safeCreate(
          () => guild.channels.create(options),
          `Salon "${channelName}"`,
          { baseDelay: 350 }
        );

        // Stocke par nom propre (sans emoji) ET par nom brut pour lookup facile
        const cleanName = chConfig.name.replace(/[^a-zA-Z0-9_·-]/g, '').toLowerCase();
        channelMap[chConfig.name] = channel.id;
        channelMap[cleanName] = channel.id;

        // Détecte les salons spéciaux
        if (chConfig.welcome_message === true) {
          welcomeChannel = channel.id;
        }
        if (chConfig.rules_message === true) {
          rulesChannel = channel.id;
        }

        channelsCreated++;
        logger.info('ServerForge:ChannelBuilder',
          `Salon créé: "${channelName}" (${channel.type === ChannelType.GuildVoice ? '🔊' : '💬'})`
        );

        progressCallback({
          type: 'channels',
          status: 'in_progress',
          current: channelsCreated,
          total: totalChannels,
          message: `Salons: ${channelsCreated}/${totalChannels}`,
        });
      } catch (err) {
        const errorMsg = `Salon "${channelName}": ${err.message}`;
        errors.push(errorMsg);
        logger.error('ServerForge:ChannelBuilder', errorMsg);

        channelsCreated++;
        progressCallback({
          type: 'channels',
          status: 'in_progress',
          current: channelsCreated,
          total: totalChannels,
          message: `Salons: ${channelsCreated}/${totalChannels}`,
        });
      }
    }
  }

  // Finalisation de la progression
  progressCallback({
    type: 'channels',
    status: errors.length > 0 && channelsCreated === 0 ? 'failed' : 'completed',
    current: channelsCreated,
    total: totalChannels,
    message: errors.length > 0
      ? `${channelsCreated} salons créés, ${errors.length} erreur(s)`
      : `${channelsCreated} salons créés avec succès`,
  });

  return { categoryMap, channelMap, welcomeChannel, rulesChannel, errors };
}

module.exports = { createChannels, buildPermissionOverwrites, parsePermissions };
