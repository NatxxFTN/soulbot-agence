'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY COMMANDS — ServerForge × Soulbot
// ═══════════════════════════════════════════════════════════════════════════════
// Enregistre les commandes slash ServerForge sur l'API Discord.
// À exécuter après chaque ajout/modification de commande :
//   node deploy-commands.js
//
// Prérequis : DISCORD_TOKEN et CLIENT_ID dans le .env
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const logger = require('./bot/utils/logger');

// ─── Définition des commandes slash ──────────────────────────────────────────
// Format standard Discord.js v14 pour l'API REST.
// Les types 1-11 sont définis par ApplicationCommandOptionType.
//
// Types d'options :
//   STRING  = 3, INTEGER = 4, BOOLEAN = 5, CHANNEL = 7, ROLE = 8, etc.
// ─────────────────────────────────────────────────────────────────────────────

const commands = [
  // ── /generate ─────────────────────────────────────────────────────────────
  {
    name: 'generate',
    description: '🏗️ Génère un serveur complet à partir du template ServerForge',
    options: [
      {
        name: 'name',
        description: 'Nom du serveur (optionnel)',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: 'reset',
        description: '⚠️ Supprime tout avant de générer (mode serveur uniquement)',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },

  // ── /save ─────────────────────────────────────────────────────────────────
  {
    name: 'save',
    description: '📋 Sauvegarde la structure d\'un serveur comme template réutilisable',
    options: [
      {
        name: 'nom',
        description: 'Nom du template (ex: "mon-serveur")',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'code',
        description: 'Code template Discord (discord.new/xxx) — scanne sans le bot dans le serveur',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },

  // ── /template ─────────────────────────────────────────────────────────────
  {
    name: 'template',
    description: '📂 Affiche les templates ServerForge disponibles',
    options: [],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },

  // ── /sf-reset ─────────────────────────────────────────────────────────────
  {
    name: 'sf-reset',
    description: '⚠️ SUPPRIME tous les salons, rôles et emojis du serveur (irréversible)',
    options: [],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },

  // ── /sf-status ───────────────────────────────────────────────────────────
  {
    name: 'sf-status',
    description: '📊 Affiche le statut de la dernière génération ServerForge',
    options: [],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
];

// ─── Enregistrement ─────────────────────────────────────────────────────────

async function deploy() {
  // Utilise FORGE_TOKEN / FORGE_CLIENT_ID pour ServerForge (bot dédié)
  const token = process.env.FORGE_TOKEN || process.env.DISCORD_TOKEN;
  const clientId = process.env.FORGE_CLIENT_ID || process.env.CLIENT_ID;

  if (!token) {
    console.error('❌ FORGE_TOKEN ou DISCORD_TOKEN manquant dans .env');
    process.exit(1);
  }

  if (!clientId) {
    console.error('❌ FORGE_CLIENT_ID ou CLIENT_ID manquant dans .env');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   ServerForge — Deploy Commands     ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  try {
    console.log(`📤 Enregistrement de ${commands.length} commande(s) slash...`);

    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log(`✅ ${data.length} commande(s) slash enregistrée(s) avec succès !`);
    console.log('');
    console.log('📋 Commandes disponibles :');
    for (const cmd of data) {
      console.log(`   /${cmd.name} — ${cmd.description}`);
    }
    console.log('');
    console.log('💡 Les commandes peuvent prendre jusqu\'à 1 heure à apparaître');
    console.log('   sur tous les serveurs (cache Discord).');
    console.log('');
  } catch (err) {
    console.error('❌ Erreur lors de l\'enregistrement :');
    console.error(`   ${err.message}`);
    if (err.rawError?.errors) {
      console.error('   Détails :', JSON.stringify(err.rawError.errors, null, 2));
    }
    process.exit(1);
  }
}

deploy();
