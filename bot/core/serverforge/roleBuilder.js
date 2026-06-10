'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE BUILDER — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Crée les rôles depuis le template, dans l'ordre (position décroissante).
// Applique : couleurs, hoist, mentionable, permissions, séparateurs, icônes.
// ═══════════════════════════════════════════════════════════════════════════════

const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { safeCreate, heavyDelay } = require('./rateLimit');
const { resolveEmojis } = require('../../config/emojis');

// ─── Permissions autorisées pour les rôles ──────────────────────────────────
// On filtre les permissions dangereuses pour les rôles non-admin.
const DANGEROUS_PERMS = new Set([
  'Administrator',
]);

/**
 * Convertit un tableau de noms de permissions en bigint.
 * @param {string[]} permNames - Noms des permissions (ex: ['ManageGuild', 'KickMembers'])
 * @returns {bigint} Permissions combinées en bigint
 */
function parsePermissions(permNames) {
  if (!Array.isArray(permNames) || permNames.length === 0) return 0n;
  let bits = 0n;
  for (const name of permNames) {
    // Vérifie que la permission existe dans Discord.js
    if (PermissionsBitField.Flags[name]) {
      bits |= PermissionsBitField.Flags[name];
    } else {
      logger.warn('ServerForge:RoleBuilder', `Permission inconnue ignorée: "${name}"`);
    }
  }
  return bits;
}

/**
 * Applique une icône à un rôle (URL directe ou fichier local).
 * Discord exige un serveur boosté niveau 2+ pour les icônes de rôles.
 * Si le serveur n'est pas boosté, la méthode échoue silencieusement.
 *
 * @param {import('discord.js').Role} role - Le rôle Discord
 * @param {object} roleConfig - Configuration du rôle depuis le template
 */
async function applyRoleIcon(role, roleConfig) {
  // Priorité 1 : icône depuis URL directe
  if (roleConfig.icon_url) {
    try {
      await role.setIcon(roleConfig.icon_url);
      await heavyDelay(500);
      logger.info('ServerForge:RoleBuilder', `Icône URL appliquée à "${role.name}"`);
      return;
    } catch (err) {
      // Échec silencieux — pas de quoi alerter l'utilisateur
      logger.debug('ServerForge:RoleBuilder',
        `Icône URL échouée pour "${role.name}": ${err.message}`
      );
    }
  }

  // Priorité 2 : icône depuis fichier local
  if (roleConfig.icon_local) {
    const iconPath = path.resolve(roleConfig.icon_local);
    if (fs.existsSync(iconPath)) {
      try {
        await role.setIcon(iconPath);
        await heavyDelay(500);
        logger.info('ServerForge:RoleBuilder', `Icône locale appliquée à "${role.name}"`);
      } catch (err) {
        logger.debug('ServerForge:RoleBuilder',
          `Icône locale échouée pour "${role.name}": ${err.message}`
        );
      }
    }
  }

  // Pas d'icône ou échec → on passe silencieusement
}

/**
 * Crée tous les rôles définis dans le template.
 * Les rôles sont créés du plus haut position au plus bas.
 *
 * @param {import('discord.js').Guild} guild - La guilde Discord
 * @param {object} template - Le template chargé
 * @param {Function} [progressCallback] - Fonction appelée pour notifier la progression
 *   Signature : ({ type, status, current, total, message })
 * @returns {Promise<{roleMap: object, errors: string[]}>}
 *   roleMap : { 'NomRôle': 'role_id' } pour référence par channelBuilder
 *
 * @example
 * const { roleMap, errors } = await createRoles(guild, template);
 * // roleMap = { 'Fondateur': '123456789', 'Membres': '987654321', ... }
 */
async function createRoles(guild, template, progressCallback = () => {}) {
  const roleMap = {};
  const errors = [];
  const rolesToCreate = [...template.roles].sort((a, b) => (b.position || 0) - (a.position || 0));
  const total = rolesToCreate.length;

  progressCallback({
    type: 'roles',
    status: 'in_progress',
    current: 0,
    total,
    message: `Création des rôles (0/${total})...`,
  });

  for (let i = 0; i < rolesToCreate.length; i++) {
    const roleConfig = rolesToCreate[i];
    const roleName = resolveEmojis(roleConfig.name);

    try {
      // Vérifie si le rôle est un séparateur visuel
      if (roleConfig.separator === true) {
        // Les séparateurs sont juste des rôles invisibles avec des tirets
        const createdRole = await safeCreate(
          () => guild.roles.create({
            name: roleName || '──────────',
            color: roleConfig.color || '#2C2F33',
            hoist: false,
            mentionable: false,
            permissions: 0n,
            reason: 'ServerForge — Séparateur de rôles',
          }),
          `Rôle séparateur "${roleName}"`,
          { baseDelay: 400 }
        );

        roleMap[roleConfig.name] = createdRole.id;
        logger.info('ServerForge:RoleBuilder',
          `Séparateur créé: "${roleName}" (${createdRole.id})`
        );
      } else {
        // Rôle normal
        const createdRole = await safeCreate(
          () => guild.roles.create({
            name: roleName,
            color: roleConfig.color || '#000000',
            hoist: roleConfig.hoist || false,
            mentionable: roleConfig.mentionable || false,
            permissions: parsePermissions(roleConfig.permissions || []),
            reason: 'ServerForge — Génération de serveur',
          }),
          `Rôle "${roleName}"`,
          { baseDelay: 400 }
        );

        // Applique l'icône si configurée
        if (roleConfig.icon_url || roleConfig.icon_local) {
          await applyRoleIcon(createdRole, roleConfig);
        }

        roleMap[roleConfig.name] = createdRole.id;
        logger.info('ServerForge:RoleBuilder',
          `Rôle créé: "${roleName}" (${createdRole.id})`
        );
      }
    } catch (err) {
      const errorMsg = `Rôle "${roleName}": ${err.message}`;
      errors.push(errorMsg);
      logger.error('ServerForge:RoleBuilder', errorMsg);
    }

    // Progression
    const current = i + 1;
    progressCallback({
      type: 'roles',
      status: current < total ? 'in_progress' : 'completed',
      current,
      total,
      message: `Rôles: ${current}/${total}`,
    });
  }

  if (errors.length > 0) {
    progressCallback({
      type: 'roles',
      status: 'failed',
      current: total - errors.length,
      total,
      message: `${errors.length} erreur(s) lors de la création des rôles`,
    });
  }

  return { roleMap, errors };
}

module.exports = { createRoles, parsePermissions, applyRoleIcon };
