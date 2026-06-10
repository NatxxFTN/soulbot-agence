'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMIT HANDLER — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Discord limite les modifications de guild à ~5 requêtes/seconde.
// Ce module fournit un wrapper sécurisé autour des appels API Discord avec
// retry automatique sur rate-limit (HTTP 429).
//
// Utilisation OBLIGATOIRE pour toute création de rôle, salon, catégorie, etc.
// ═══════════════════════════════════════════════════════════════════════════════

const logger = require('../../utils/logger');

/**
 * Pause asynchrone — bloquant mais non-bloquant pour le reste du processus.
 * @param {number} ms - Millisecondes à attendre
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exécute une fonction d'appel API Discord avec retry automatique sur rate-limit.
 * Utilise un backoff exponentiel pour respecter les limites Discord.
 *
 * @param {Function} fn - Fonction asynchrone à exécuter (doit retourner un appel API Discord)
 * @param {string} label - Nom de l'opération (pour les logs)
 * @param {object} [options] - Options
 * @param {number} [options.retries=3] - Nombre maximum de tentatives
 * @param {number} [options.baseDelay=500] - Délai de base entre chaque tentative (ms)
 * @returns {Promise<any>} Résultat de l'appel API
 *
 * @example
 * const role = await safeCreate(
 *   () => guild.roles.create({ name: 'Admin', color: '#FF0000' }),
 *   'Rôle Admin'
 * );
 */
async function safeCreate(fn, label, options = {}) {
  const { retries = 3, baseDelay = 500 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      // Pause systématique entre chaque appel — anti-rate-limit
      await delay(baseDelay);
      return result;
    } catch (error) {
      // Rate-limit Discord (HTTP 429)
      if (error.code === 429) {
        const retryAfter = (error.retryAfter || error.timeout || 5) * 1000;
        logger.warn('ServerForge',
          `Rate-limit sur "${label}" — attente de ${(retryAfter / 1000).toFixed(1)}s (tentative ${i + 1}/${retries})`
        );
        await delay(retryAfter + 500); // +500ms de marge de sécurité
        continue;
      }

      // Missing permissions — ne pas retry
      if (error.code === 50013) {
        throw new Error(`Permissions insuffisantes pour "${label}": ${error.message}`);
      }

      // Si c'était la dernière tentative, on propage l'erreur
      if (i === retries - 1) {
        throw error;
      }

      // Erreur transitoire — petite pause puis retry
      logger.warn('ServerForge',
        `Erreur transitoire sur "${label}" — retry ${i + 2}/${retries}: ${error.message}`
      );
      await delay(baseDelay * (i + 1));
    }
  }
}

/**
 * Attend un délai plus long pour les opération lourdes (création d'icône de rôle).
 * @param {number} [ms=800] - Millisecondes à attendre
 * @returns {Promise<void>}
 */
function heavyDelay(ms = 800) {
  return delay(ms);
}

module.exports = { delay, safeCreate, heavyDelay };
