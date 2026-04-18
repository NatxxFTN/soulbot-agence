'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Charge tous les événements depuis bot/events/
 * Chaque fichier doit exporter : { name, execute, [once] }
 *
 * @param {import('discord.js').Client} client
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const files      = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  let loaded = 0;

  for (const file of files) {
    const filePath = path.join(eventsPath, file);

    try {
      delete require.cache[require.resolve(filePath)];
      const event = require(filePath);

      if (!event?.name || typeof event.execute !== 'function') {
        console.warn(`[EventHandler] ${file} — propriété "name" ou "execute" manquante, ignoré.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      loaded++;
    } catch (err) {
      console.error(`[EventHandler] Erreur lors du chargement de ${file}:`, err.message);
    }
  }

  console.log(`[EventHandler] ${loaded} événement(s) enregistré(s)`);
}

module.exports = { loadEvents };
