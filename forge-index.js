'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORGE INDEX — ServerForge Bot (autonome)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Bot dédié à ServerForge, utilisant son propre token (FORGE_TOKEN).
 * Ne charge que les commandes et core nécessaires au générateur.
 *
 * Démarrage :
 *   node forge-index.js
 *   npm run forge
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { db } = require('./bot/database');
const logger = require('./bot/utils/logger');

// ─── Vérification du token ─────────────────────────────────────────────────
const token = process.env.FORGE_TOKEN;
if (!token) {
  console.error('');
  console.error('╔══════════════════════════════════════╗');
  console.error('║   ServerForge — Token manquant       ║');
  console.error('╚══════════════════════════════════════╝');
  console.error('');
  console.error('Ajoute FORGE_TOKEN=ton_token dans le fichier .env');
  console.error('');
  process.exit(1);
}

// ─── Client (lightweight — intents non-privilégiés uniquement) ───────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ─── Propriétés globales ─────────────────────────────────────────────────────
client.db = db;
client.commands = new Collection();
client.cooldowns = new Collection();

// ─── Chargement manuel des commandes ServerForge uniquement ──────────────────
function loadForgeCommands() {
  const fs = require('fs');
  const path = require('path');
  const commandsDir = path.join(__dirname, 'bot/commands/serverforge');

  if (!fs.existsSync(commandsDir)) {
    logger.error('ServerForge', `Dossier introuvable : ${commandsDir}`);
    return;
  }

  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const filePath = path.join(commandsDir, file);
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);
      if (command.name && command.execute) {
        client.commands.set(command.name, command);
        logger.info('ServerForge', `  ✓ ${command.name}`);
      } else {
        logger.warn('ServerForge', `  ⚠️  ${file} : pas de name/execute`);
      }
    } catch (err) {
      logger.error('ServerForge', `  ❌ ${file} : ${err.message}`);
    }
  }
  logger.info('ServerForge', `${client.commands.size} commande(s) chargée(s)`);
}

loadForgeCommands();

// ─── Gestionnaire d'interactions — DM + Serveur ─────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply({
      content: '❌ Commande inconnue.',
      ephemeral: true,
    });
  }

  try {
    await command.execute(interaction, client);
  } catch (err) {
    logger.error('ServerForge', `Erreur ${interaction.commandName} : ${err.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ Erreur : ${err.message}`,
        ephemeral: true,
      });
    }
  }
});

// ─── Log au démarrage ───────────────────────────────────────────────────────
client.once('clientReady', () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   ServerForge — Bot prêt             ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log(`  Connecté en tant que : ${client.user.tag}`);
  console.log(`  Serveurs : ${client.guilds.cache.size}`);
  console.log(`  Commandes : ${client.commands.size}`);
  console.log('');
});

// ─── Events logging basique ─────────────────────────────────────────────────
client.on('guildCreate', guild => {
  logger.info('ServerForge', `Ajouté au serveur ${guild.name} (${guild.memberCount} membres)`);
});

client.on('guildDelete', guild => {
  logger.info('ServerForge', `Retiré du serveur ${guild.name}`);
});

client.on('error', err => {
  logger.error('ServerForge', `Erreur client : ${err.message}`);
});

// ─── Login ──────────────────────────────────────────────────────────────────
client.login(token).catch(err => {
  logger.error('ServerForge', `Échec du login : ${err.message}`);
  process.exit(1);
});

// ─── Graceful shutdown ──────────────────────────────────────────────────────
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('ServerForge', `Signal ${signal} reçu — arrêt propre...`);

  try {
    client.removeAllListeners();
    if (client.isReady()) {
      await client.destroy();
      logger.info('ServerForge', 'Connexion Discord fermée');
    }
    if (db) {
      try { db.close(); } catch { /* ignoré */ }
    }
    logger.info('ServerForge', 'Arrêt propre terminé');
    process.exit(0);
  } catch (err) {
    logger.error('ServerForge', `Erreur pendant shutdown : ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.errorStack('Process', reason instanceof Error ? reason : new Error(String(reason)));
});
process.on('uncaughtException', (err) => {
  logger.error('Process', `Uncaught Exception: ${err.message}`);
  if (err.stack) process.stderr.write(err.stack + '\n');
  gracefulShutdown('uncaughtException');
});

module.exports = client;
