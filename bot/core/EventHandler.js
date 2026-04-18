'use strict';

// POURQUOI ce module duplique partiellement handlers/EventHandler.js :
// la version core reçoit logger par injection et gère les erreurs par événement
// sans crasher l'ensemble. handlers/ sera retiré en Phase 2.
// Référence : ARCHITECT_LOGIC.md §3

const fs   = require('fs');
const path = require('path');

const EVENTS_ROOT = path.join(__dirname, '../events');

/**
 * Charge tous les événements depuis bot/events/
 * Chaque fichier doit exporter : { name, once?, execute }
 *
 * @param {import('discord.js').Client} client
 * @param {import('../utils/logger')}   logger
 */
function loadEvents(client, logger) {
  // Retire tous les listeners existants pour éviter les doublons lors d'un reload
  client.removeAllListeners();

  const files = fs.readdirSync(EVENTS_ROOT).filter(f => f.endsWith('.js'));
  let loaded  = 0;

  for (const file of files) {
    const filePath = path.join(EVENTS_ROOT, file);

    try {
      delete require.cache[require.resolve(filePath)];
      const event = require(filePath);

      if (!event?.name || typeof event.execute !== 'function') {
        logger.warn('EventHandler', `${file} — "name" ou "execute" manquant, ignoré`);
        continue;
      }

      // Wrapper qui isole les erreurs par événement.
      // POURQUOI isoler : une exception dans un handler voiceStateUpdate ne
      // doit pas supprimer les listeners messageCreate. Sans wrapper,
      // une rejection non catchée peut silencer un event entier.
      const handler = async (...args) => {
        try {
          await event.execute(...args, client);
        } catch (err) {
          logger.errorStack(`Event:${event.name}`, err);
        }
      };

      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }

      loaded++;
    } catch (err) {
      logger.errorStack('EventHandler', err);
    }
  }

  logger.info('EventHandler', `${loaded} événement(s) enregistré(s)`);
}

module.exports = { loadEvents };
