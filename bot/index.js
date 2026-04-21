'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// ─── Singleton — un seul bot actif autorisé ───────────────────────────────────
const { acquireLock } = require('./core/singleton-lock');
acquireLock();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands }  = require('./core/CommandHandler');
const { register: registerUIHandlers }       = require('./ui/handlers/greeting-handler');
const { register: registerTicketHandlers }   = require('./ui/handlers/ticket-handler');
const { register: registerAntileakHandlers } = require('./ui/handlers/antileak-handler');
const { register: registerAntispamHandlers }  = require('./ui/handlers/antispam-handler');
const { register: registerNukeHandlers }      = require('./ui/handlers/nuke-handler');
const { register: registerLockdownHandlers }  = require('./ui/handlers/lockdown-handler');
const { register: registerRaidmodeHandlers }  = require('./ui/handlers/raidmode-handler');
const { register: registerMassbanHandlers }   = require('./ui/handlers/massban-handler');
const { register: registerHelpHandlers }      = require('./ui/handlers/help-handler');
const { register: registerModconfigHandlers } = require('./ui/handlers/modconfig-handler');
const { register: registerWarnconfigHandlers }= require('./ui/handlers/warnconfig-handler');
const { register: registerWelcomeHandlers }   = require('./ui/handlers/welcome-handler');
const { loadEvents }    = require('./handlers/EventHandler');
const { db }            = require('./database');
const logger            = require('./utils/logger');
const botLogger         = require('./core/logger');

// ─── Client ──────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
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
registerUIHandlers(client);
registerTicketHandlers(client);
registerAntileakHandlers(client);
registerAntispamHandlers(client);
registerNukeHandlers(client);
registerLockdownHandlers(client);
registerRaidmodeHandlers(client);
registerMassbanHandlers(client);
registerHelpHandlers(client);
registerModconfigHandlers(client);
registerWarnconfigHandlers(client);
registerWelcomeHandlers(client);
loadEvents(client);

// ─── Events dashboard logging ────────────────────────────────────────────────
client.on('guildCreate', guild => {
  botLogger.event({
    eventType : 'guild_join',
    guildId   : guild.id,
    guildName : guild.name,
    message   : `Bot ajouté au serveur ${guild.name} (${guild.memberCount} membres)`,
  });
});

client.on('guildDelete', guild => {
  botLogger.event({
    eventType : 'guild_leave',
    guildId   : guild.id,
    guildName : guild.name,
    message   : `Bot retiré du serveur ${guild.name}`,
  });
});

client.on('error', err => {
  botLogger.error({
    eventType : 'client_error',
    message   : err.message,
    metadata  : { stack: err.stack },
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch(err => {
  logger.error('Bot', `Échec du login: ${err.message}`);
  process.exit(1);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Bot', `Signal ${signal} reçu — arrêt propre...`);

  try {
    client.removeAllListeners();

    if (client.isReady()) {
      await client.destroy();
      logger.info('Bot', 'Connexion Discord fermée');
    }

    if (db) {
      try { db.close(); logger.info('Bot', 'Database fermée'); } catch { /* ignoré */ }
    }

    logger.info('Bot', 'Arrêt propre terminé');
    process.exit(0);
  } catch (err) {
    logger.error('Bot', `Erreur pendant shutdown: ${err.message}`);
    process.exit(1);
  }
}

// Signaux d'arrêt (nodemon envoie SIGTERM par défaut)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGHUP',  () => gracefulShutdown('SIGHUP'));

// POURQUOI ne PAS exit sur unhandledRejection : Discord.js gère le retry
// en interne. Crasher ici tuerait le bot pour une erreur temporaire réseau.
process.on('unhandledRejection', (reason) => {
  logger.errorStack('Process', reason instanceof Error ? reason : new Error(String(reason)));
});

// POURQUOI exit sur uncaughtException : état d'exécution potentiellement
// corrompu. Le graceful shutdown ferme proprement avant exit.
process.on('uncaughtException', (err) => {
  logger.error('Process', `Uncaught Exception: ${err.message}`);
  if (err.stack) process.stderr.write(err.stack + '\n');
  gracefulShutdown('uncaughtException');
});

module.exports = client;
