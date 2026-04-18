'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Charge toutes les commandes depuis bot/commands/**
 * Chaque fichier doit exporter : { name, execute, [aliases], [cooldown], [permissions] }
 *
 * @param {import('discord.js').Client} client
 */
function loadCommands(client) {
  const commandsRoot = path.join(__dirname, '../commands');
  const categories   = fs.readdirSync(commandsRoot);

  let loaded  = 0;
  let skipped = 0;

  for (const category of categories) {
    const categoryPath = path.join(commandsRoot, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);

      try {
        // Purge du cache pour permettre un rechargement à chaud
        delete require.cache[require.resolve(filePath)];
        const cmd = require(filePath);

        if (!cmd?.name || typeof cmd.execute !== 'function') {
          console.warn(`[CommandHandler] ${category}/${file} — propriété "name" ou "execute" manquante, ignoré.`);
          skipped++;
          continue;
        }

        cmd.category = category;
        client.commands.set(cmd.name.toLowerCase(), cmd);

        if (Array.isArray(cmd.aliases)) {
          for (const alias of cmd.aliases) {
            client.aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
          }
        }

        loaded++;
      } catch (err) {
        console.error(`[CommandHandler] Erreur lors du chargement de ${category}/${file}:`, err.message);
        skipped++;
      }
    }
  }

  console.log(`[CommandHandler] ${loaded} commande(s) chargée(s) — ${skipped} ignorée(s)`);
}

/**
 * Recharge une commande spécifique à la volée
 * @param {import('discord.js').Client} client
 * @param {string} commandName
 * @returns {boolean} succès
 */
function reloadCommand(client, commandName) {
  const cmd = client.commands.get(commandName);
  if (!cmd) return false;

  const filePath = path.join(
    __dirname, '../commands', cmd.category, `${commandName}.js`
  );
  if (!fs.existsSync(filePath)) return false;

  try {
    delete require.cache[require.resolve(filePath)];
    const newCmd = require(filePath);
    newCmd.category = cmd.category;
    client.commands.set(newCmd.name.toLowerCase(), newCmd);
    return true;
  } catch {
    return false;
  }
}

module.exports = { loadCommands, reloadCommand };
