'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands }  = require('./core/CommandHandler');
const { loadEvents }    = require('./handlers/EventHandler');
const { db }            = require('./database');
const logger            = require('./utils/logger');

// ─── Client ──────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

// ─── Propriétés globales ─────────────────────────────────────────────────────
client.db             = db;
client.commands       = new Collection();  // name  → command
client.aliases        = new Collection();  // alias → command name
client.cooldowns      = new Collection();  // "cmdName:userId" → timestamp
client.inviteCache    = new Collection();  // guildId → Map<code, uses>
// Registres d'handlers d'interactions (boutons, modals, selects)
// Les commandes qui en ont besoin font : client.buttonHandlers.set('action', fn)
client.buttonHandlers = new Collection();
client.modalHandlers  = new Collection();
client.selectHandlers = new Collection();

// ─── Chargement ──────────────────────────────────────────────────────────────
loadCommands(client, logger);
loadEvents(client);

// ─── Login ───────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch(err => {
  logger.error('Bot', `Échec du login: ${err.message}`);
  process.exit(1);
});

// ─── Erreurs non catchées ─────────────────────────────────────────────────────

// POURQUOI ne PAS exit sur unhandledRejection : le client Discord.js gère le retry
// de certaines promesses en interne. Crasher ici tuerait le bot pour une erreur
// temporaire (réseau, rate limit). On log et on continue.
process.on('unhandledRejection', (reason) => {
  logger.errorStack('Process', reason instanceof Error ? reason : new Error(String(reason)));
});

// POURQUOI exit(1) sur uncaughtException : contrairement aux rejections,
// une exception non catchée indique un état d'exécution potentiellement corrompu.
// Il est plus sûr de laisser le process manager (PM2, Docker) relancer proprement
// que de continuer dans un état inconnu. Référence : AUDITOR_CRITICAL_POINTS §1.2
process.on('uncaughtException', (err) => {
  logger.error('Process', `Uncaught Exception — arrêt immédiat: ${err.message}`);
  if (err.stack) process.stderr.write(err.stack + '\n');
  process.exit(1);
});

module.exports = client;
