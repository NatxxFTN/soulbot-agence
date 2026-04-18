# ARCHITECT_LOGIC.md
# Conscience Technique — Architecte Système
# Niveau : Senior 10 ans · discord.js v14 · Node.js production
# Ce fichier est lu AVANT chaque production de code. Sans exception.

---

## 1. PHILOSOPHIE FONDAMENTALE

Tu n'écris pas du code. Tu construis une infrastructure.
Chaque ligne que tu poses doit résister à :
- 500 serveurs Discord simultanés
- 10 000 messages/seconde en pic
- Un redémarrage imprévu à 3h du matin sans perte de données
- Un dev junior qui reprend le projet dans 2 ans sans toi

Si ton code ne survit pas à ces 4 scénarios, recommence.

---

## 2. PATTERNS v14 OBLIGATOIRES

### 2.1 Client — Instanciation correcte

```javascript
// OBLIGATOIRE — Intents déclarés explicitement, jamais de GatewayIntentBits.Guilds seul
// POURQUOI : Les intents non déclarés causent des silent failures impossibles à debugger
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,   // Privileged — doit être activé sur portal
    GatewayIntentBits.GuildMembers,     // Privileged — requis pour guildMemberAdd/Remove
    GatewayIntentBits.GuildVoiceStates, // Requis pour voiceStateUpdate
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
  // POURQUOI partials : les reactions sur anciens messages arrivent partielles.
  // Sans partials, messageReactionAdd ne fire pas sur messages antérieurs au bot start.
});
```

### 2.2 CommandHandler — Architecture obligatoire

```javascript
// POURQUOI injection et non instanciation interne :
// Le CommandHandler ne doit pas savoir comment la DB est construite.
// Il reçoit une interface. Ce découplage permet les tests unitaires sans DB réelle.
class CommandHandler {
  constructor(client, db, logger) {
    this.client = client;
    this.db = db;           // Interface injectée — jamais instanciée ici
    this.logger = logger;   // Logger injecté — jamais console.log() en prod
    this.commands = new Collection(); // Collection Discord.js, pas Map native
    this.aliases = new Collection();  // Index aliases → nom canonique
    this.cooldowns = new Collection(); // Séparé des commandes pour perf O(1)
  }
}
```

### 2.3 Chargement des commandes — Pattern correct v14

```javascript
// POURQUOI readdirSync et non readdir async :
// Le chargement est bloquant une seule fois au démarrage.
// L'async ici crée des race conditions si une commande se charge
// après que le bot soit déjà ready et répond à des messages.
async load() {
  const categories = readdirSync('./commands');

  for (const category of categories) {
    const files = readdirSync(`./commands/${category}`)
      .filter(f => f.endsWith('.js'));

    for (const file of files) {
      const command = require(`./commands/${category}/${file}`);

      // Guard obligatoire — une commande mal formée ne crash pas tout le bot
      if (!command.name || !command.execute) {
        this.logger.warn(`[CommandHandler] ${file} ignoré : structure invalide`);
        continue;
      }

      this.commands.set(command.name, command);

      if (command.aliases?.length) {
        command.aliases.forEach(alias => this.aliases.set(alias, command.name));
      }
    }
  }
}
```

### 2.4 Interaction Handler — v14 strict

```javascript
// RÈGLE ABSOLUE v14 : toujours vérifier isChatInputCommand() avant de caster
// POURQUOI : interactionCreate fire pour TOUS les types (buttons, modals, menus).
// Caster sans vérifier = TypeError silencieux en production.
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) { /* slash commands */ }
  if (interaction.isButton())           { /* boutons pagination */ }
  if (interaction.isStringSelectMenu()) { /* menus déroulants */ }
  if (interaction.isModalSubmit())      { /* modals ticket */ }
  // JAMAIS de else final sans log — les interactions inconnues doivent être tracées
});
```

### 2.5 Reply / DeferReply — Règle des 3 secondes

```javascript
// RÈGLE CRITIQUE : Discord tue les interactions sans réponse après 3 secondes.
// PATTERN OBLIGATOIRE pour toute opération > 1 seconde (DB, API, graphique) :
async execute(interaction) {
  await interaction.deferReply(); // Envoie "Bot réfléchit..." immédiatement
  // ... traitement long (QuickChart, SQLite, etc.)
  await interaction.editReply({ embeds: [embed] }); // Remplace le defer
  // JAMAIS interaction.reply() après deferReply() → erreur InteractionAlreadyReplied
}
```

### 2.6 Gestion des erreurs sur interaction — Pattern obligatoire

```javascript
// POURQUOI ce pattern précis :
// interaction.replied et interaction.deferred évitent le double-reply
// qui crash le handler et laisse l'utilisateur sans feedback.
try {
  await command.execute(interaction, client, db);
} catch (error) {
  logger.error(`[${command.name}] ${error.message}`, { stack: error.stack });

  const payload = {
    embeds: [ErrorEmbed.build(error)],
    ephemeral: true, // Erreur visible uniquement par l'utilisateur
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload).catch(() => null);
  } else {
    await interaction.reply(payload).catch(() => null);
  }
}
```

---

## 3. SHARDING — Penser MAINTENANT, Implémenter PLUS TARD

### 3.1 Règles de code Shard-safe (obligatoires dès la v1)

```javascript
// ❌ INTERDIT — accès direct client.guilds en contexte potentiellement shardé
const guilds = client.guilds.cache;

// ✅ OBLIGATOIRE — abstraire derrière une méthode, préparée pour broadcastEval
// POURQUOI : quand le Sharding arrive, on remplace UNE méthode, pas 40 appels
async function getGuildCount() {
  if (client.shard) {
    const counts = await client.shard.broadcastEval(c => c.guilds.cache.size);
    return counts.reduce((acc, val) => acc + val, 0);
  }
  return client.guilds.cache.size;
}
```

### 3.2 Structure ShardingManager (prête à activer)

```javascript
// bot/shard.js — point d'entrée alternatif quand guilds > 2500
// POURQUOI fichier séparé : index.js reste intact, on switche l'entrée dans package.json
const { ShardingManager } = require('discord.js');
const manager = new ShardingManager('./bot/index.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto', // Discord calcule le nombre optimal
  respawn: true,       // POURQUOI : shard crash = relance auto, pas downtime total
});

manager.on('shardCreate', shard => {
  logger.info(`[Shard ${shard.id}] Lancé`);
});

manager.spawn();
```

### 3.3 SQLite et Sharding — Problème anticipé

```javascript
// POURQUOI WAL mode est non-négociable :
// En mode journal par défaut, SQLite pose un verrou exclusif à l'écriture.
// Avec WAL, les lectures concurrentes ne bloquent pas les écritures.
// Critique quand plusieurs shards accèdent simultanément à bot.db.
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL'); // POURQUOI : balance perf/durabilité sans full FSYNC
db.pragma('cache_size = -64000');   // 64MB cache — POURQUOI : réduit I/O disque sous charge
db.pragma('foreign_keys = ON');     // POURQUOI : intégrité référentielle garantie en SQLite
```

---

## 4. STRUCTURE D'UNE COMMANDE — Format standard obligatoire

```javascript
// POURQUOI cette structure exacte :
// Le CommandHandler attend ces propriétés. Une commande qui dévie = ignorée silencieusement.
// Le champ 'category' permet le groupement automatique dans +help sans configuration manuelle.
module.exports = {
  name: 'nomcommande',        // Nom canonique — tout en minuscules, sans accents
  aliases: ['alias1'],        // Tableau vide si aucun alias — jamais undefined
  description: 'Description courte, affichée dans +help',
  usage: '+nomcommande <obligatoire> [optionnel]',
  category: 'stats',          // Doit correspondre au nom du dossier parent
  cooldown: 5,                // En secondes — 0 = pas de cooldown (owner only)
  permissions: ['SendMessages'], // Permissions Discord.js v14 requises par le bot
  userPermissions: [],           // Permissions requises par l'utilisateur
  ownerOnly: false,
  guildOnly: true,            // POURQUOI : 99% des commandes n'ont pas de sens en DM

  async execute(message, args, client, db) {
    // Toute la logique ici — jamais de logique dans le CommandHandler
  },
};
```

---

## 5. EVENTS — Fichiers obligatoires et comportement attendu

| Event | Déclencheur | Précaution critique |
|---|---|---|
| `ready` | Bot connecté | Une seule fois — utiliser `{ once: true }` |
| `messageCreate` | Message reçu | Ignorer `msg.author.bot` en PREMIER avant tout |
| `interactionCreate` | Bouton/slash/modal | Dispatcher par type avant d'agir |
| `voiceStateUpdate` | Entrée/sortie vocal | oldState peut être null — guard obligatoire |
| `guildMemberAdd` | Nouveau membre | Vérifier que le guild est fetché (partials) |
| `guildMemberRemove` | Membre part | Le member peut être partial — fetch si nécessaire |
| `messageReactionAdd` | Réaction ajoutée | Message et reaction peuvent être partiels — fetch |

---

## 6. INTERDICTIONS ABSOLUES

Ces patterns sont des fautes professionnelles. Tout code les contenant est retourné sans discussion.

```javascript
// ❌ INTERDIT — Event v13, n'existe pas en v14
client.on('message', handler);

// ❌ INTERDIT — Token dans le code source
client.login('Mon.Token.Discord');

// ❌ INTERDIT — console.log() en production
console.log('Commande exécutée');

// ❌ INTERDIT — require() synchrone dans une commande (ralentit le thread)
const data = require('../../data/config.json');

// ❌ INTERDIT — Promise non gérée
someAsyncFunction(); // Sans await ni .catch()

// ❌ INTERDIT — Accès client.guilds.cache sans guard shard
const count = client.guilds.cache.size;

// ❌ INTERDIT — interaction.reply() après deferReply()
await interaction.deferReply();
await interaction.reply({ content: '...' }); // InteractionAlreadyReplied
```
