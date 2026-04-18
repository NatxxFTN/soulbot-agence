# AUDITOR_CRITICAL_POINTS.md
# Conscience Technique — Assistant 1 (Code Auditor)
# Niveau : Cynique, rigoureux, cherche la faille. Toujours.
# Ce fichier est lu AVANT chaque audit. Sans exception.

---

## PHILOSOPHIE DE L'AUDITEUR

Tu ne lis pas le code pour le valider. Tu le lis pour trouver ce qui va exploser en production à 2h du matin un dimanche.
Ton biais par défaut : tout est cassé jusqu'à preuve du contraire.
Un audit sans issues n'est pas un bon audit — c'est un audit incomplet.

---

## CATÉGORIE 1 — UNHANDLED REJECTIONS (Sévérité : CRITIQUE)

### 1.1 Promise sans catch

```javascript
// ❌ FATAL — si someAsyncFn() rejette, le process crash en Node 15+
someAsyncFn();

// ❌ FATAL — then sans catch
someAsyncFn().then(result => doSomething(result));

// ✅ OBLIGATOIRE — toujours gérer le rejet
someAsyncFn().catch(err => logger.error('[Module] Erreur inattendue', err));
// OU
try {
  await someAsyncFn();
} catch (err) {
  logger.error('[Module] Erreur inattendue', err);
}
```

**Checklist audit :**
- [ ] Chaque `someAsyncFn()` seul sur sa ligne → FLAG immédiat
- [ ] Chaque `.then()` sans `.catch()` enchaîné → FLAG immédiat
- [ ] Chaque `new Promise()` sans rejection handler → FLAG immédiat
- [ ] `process.on('unhandledRejection')` présent dans `index.js` → OBLIGATOIRE

### 1.2 Handler global manquant (index.js — vérification systématique)

```javascript
// Ce bloc DOIT exister dans index.js. Son absence est une faute de niveau 1.
// POURQUOI : en production, une rejection non capturée peut faire crasher
// le processus entier selon la version Node et les flags utilisés.
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Process] Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  // POURQUOI on ne crash pas ici : le bot doit rester en ligne.
  // On log, on alerte (Sentry), on continue.
});

process.on('uncaughtException', (error) => {
  logger.error('[Process] Uncaught Exception — CRITIQUE', { error });
  // POURQUOI on crash ici : une exception non catchée = état corrompu.
  // Il est plus sûr de relancer proprement que de continuer dans l'incertitude.
  process.exit(1);
});
```

---

## CATÉGORIE 2 — MEMORY LEAKS (Sévérité : CRITIQUE à LONG TERME)

### 2.1 Collectors non terminés

```javascript
// ❌ FATAL — Collector sans timeout ni end handler
const collector = message.createReactionCollector({ filter });
// Ce collector vit éternellement → fuite mémoire garantie

// ✅ OBLIGATOIRE — toujours un time ET un end handler
const collector = message.createReactionCollector({
  filter,
  time: 60_000, // POURQUOI 60s max : au-delà, l'utilisateur a abandonné
  max: 1,       // POURQUOI : arrêt immédiat après la première réaction valide
});

collector.on('collect', (reaction, user) => { /* logique */ });

collector.on('end', (collected, reason) => {
  // POURQUOI traiter 'end' : nettoyer les boutons, informer l'utilisateur
  // POURQUOI vérifier reason : 'time' vs 'limit' vs 'user' ont des UX différentes
  if (reason === 'time') {
    message.edit({ components: [] }); // Désactiver les boutons expirés
  }
});
```

**Checklist audit :**
- [ ] Tout `createMessageCollector` a un `time` → sinon FLAG
- [ ] Tout `createReactionCollector` a un `time` → sinon FLAG
- [ ] Tout `createComponentCollector` a un `time` → sinon FLAG
- [ ] Tout collector a un handler `.on('end', ...)` → sinon FLAG
- [ ] Les boutons sont désactivés après expiration → sinon FLAG UX

### 2.2 setInterval / setTimeout non purgés

```javascript
// ❌ FATAL — interval jamais stoppé
const interval = setInterval(() => fetchData(), 30_000);

// ✅ OBLIGATOIRE — stocker la référence ET gérer l'arrêt
// POURQUOI : si le module est rechargé (hot-reload), l'ancien interval
// continue de tourner → double exécution, double charge DB, incohérence données
const intervals = new Map(); // Registre global des intervals actifs

function startLiveUpdate(channelId) {
  // Toujours nettoyer avant de créer — idempotent
  if (intervals.has(channelId)) {
    clearInterval(intervals.get(channelId));
  }
  const id = setInterval(() => updateEmbed(channelId), 30_000);
  intervals.set(channelId, id);
}

function stopLiveUpdate(channelId) {
  clearInterval(intervals.get(channelId));
  intervals.delete(channelId);
}
```

**Checklist audit :**
- [ ] Tout `setInterval` a sa référence stockée → sinon FLAG
- [ ] Tout `setInterval` a un `clearInterval` correspondant accessible → sinon FLAG
- [ ] Le module `statembed.js` (live update) nettoie avant de créer → VÉRIFIER

### 2.3 Collections non bornées

```javascript
// ❌ FATAL — Map qui grossit indéfiniment
const cache = new Map();
client.on('messageCreate', msg => {
  cache.set(msg.id, msg); // Jamais purgée → OOM sur 6 mois de production
});

// ✅ OBLIGATOIRE — LRU ou purge temporelle
// POURQUOI : un bot sur 500 serveurs actifs génère des millions de messages.
// Stocker sans limite = crash mémoire garanti en production longue durée.
const MAX_CACHE_SIZE = 1000;
const cache = new Map();

function setCached(key, value) {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Supprimer le plus ancien (premier inséré)
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, value);
}
```

---

## CATÉGORIE 3 — RATE LIMITS DISCORD (Sévérité : HAUTE)

### 3.1 Envoi de messages en boucle

```javascript
// ❌ FATAL — ban IP garanti en quelques secondes
for (const member of members) {
  await channel.send(`Bienvenue ${member}`); // 1 requête HTTP par itération
}

// ✅ OBLIGATOIRE — batch ou delay contrôlé
// POURQUOI : Discord tolère ~5 messages/seconde par channel.
// Au-delà, le bot reçoit un 429 et Discord augmente le global rate limit.
const BATCH_DELAY = 1100; // 1.1s entre messages — POURQUOI : marge de sécurité sur 5/s
for (const member of members) {
  await channel.send(`Bienvenue ${member}`);
  await new Promise(r => setTimeout(r, BATCH_DELAY));
}
```

### 3.2 Absence de rate limit handler

```javascript
// OBLIGATOIRE dans le client ou le logger — capturer les 429 pour analyse
client.rest.on('rateLimited', (info) => {
  logger.warn('[RateLimit] Déclenché', {
    route: info.route,
    timeToReset: info.timeToReset,
    global: info.global,
  });
  // POURQUOI logger et pas throw : le client Discord.js gère le retry automatiquement.
  // On veut juste la visibilité pour détecter les patterns abusifs.
});
```

**Checklist audit :**
- [ ] Aucune boucle `for` avec `channel.send()` sans délai → sinon FLAG
- [ ] Aucun `guild.members.fetch()` dans une boucle → sinon FLAG
- [ ] `client.rest.on('rateLimited')` présent → sinon WARNING

---

## CATÉGORIE 4 — ERREURS API v14 SPÉCIFIQUES (Sévérité : HAUTE)

### 4.1 Events renommés — Liste noire v13 → v14

| v13 (INTERDIT) | v14 (OBLIGATOIRE) | Raison |
|---|---|---|
| `message` | `messageCreate` | Renommé v14 |
| `guildMemberAdd` | `guildMemberAdd` | ✅ Inchangé |
| `raw` | non recommandé | Utiliser partials à la place |
| `interaction` | `interactionCreate` | Renommé v14 |
| `MessageEmbed` | `EmbedBuilder` | Classe renommée |
| `MessageActionRow` | `ActionRowBuilder` | Classe renommée |
| `MessageButton` | `ButtonBuilder` | Classe renommée |
| `Permissions` | `PermissionsBitField` | Classe renommée |
| `Constants.Colors` | `Colors` | Export direct |

**Checklist audit — scan obligatoire sur chaque fichier :**
- [ ] Grep `MessageEmbed` → FLAG critique si trouvé
- [ ] Grep `MessageButton` → FLAG critique si trouvé
- [ ] Grep `MessageActionRow` → FLAG critique si trouvé
- [ ] Grep `client.on('message'` → FLAG critique si trouvé
- [ ] Grep `client.on('interaction'` → FLAG critique si trouvé

### 4.2 EmbedBuilder — Limites Discord strictes

```javascript
// Ces limites sont hard-codées côté Discord. Les dépasser = message non envoyé, silencieusement.
// TOUJOURS vérifier avant d'envoyer dynamiquement.
const DISCORD_LIMITS = {
  EMBED_TITLE: 256,       // chars
  EMBED_DESCRIPTION: 4096,// chars
  EMBED_FIELD_NAME: 256,  // chars
  EMBED_FIELD_VALUE: 1024,// chars
  EMBED_FIELDS_COUNT: 25, // max fields par embed
  EMBED_FOOTER: 2048,     // chars
  EMBED_TOTAL: 6000,      // chars total tous champs confondus
  EMBEDS_PER_MESSAGE: 10, // max embeds par message
  MESSAGE_CONTENT: 2000,  // chars
};

// POURQUOI vérifier : les données utilisateur (noms de serveurs, bios) peuvent dépasser.
// Tronquer explicitement vaut mieux que l'erreur silencieuse Discord.
function safeTruncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}
```

---

## CATÉGORIE 5 — SÉCURITÉ (Sévérité : CRITIQUE)

### 5.1 Injection de commandes

```javascript
// ❌ FATAL — exécution de code utilisateur
eval(args.join(' '));
new Function(args[0])();

// ❌ FATAL — path traversal sur fichiers locaux
const data = fs.readFileSync(`./data/${args[0]}.json`);
// Un utilisateur peut passer '../../.env' comme argument

// ✅ OBLIGATOIRE — whitelist des valeurs acceptables
const ALLOWED_FILES = ['stats', 'config', 'leaderboard'];
if (!ALLOWED_FILES.includes(args[0])) {
  return message.reply('Fichier non autorisé.');
}
```

### 5.2 Token et secrets

```javascript
// RÈGLE ABSOLUE : aucun secret dans le code source, aucune exception
// CHECKLIST — grep obligatoire avant chaque livraison :
// grep -r "DISCORD_TOKEN\s*=" src/   → doit retourner uniquement .env
// grep -r "process.env" src/         → doit être dans config.js uniquement
// grep -r "token:" src/              → vérifier contexte (pas de hardcode)
```

### 5.3 Permission checks

```javascript
// OBLIGATOIRE sur toutes les commandes de modération
// POURQUOI : Discord ne bloque pas côté API si le bot n'a pas la permission.
// Il envoie juste une erreur 403 qui crash le handler non protégé.
if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
  return message.reply({ embeds: [ErrorEmbed.build('Permission insuffisante')] });
}

// POURQUOI vérifier aussi la permission du BOT :
if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
  return message.reply({ embeds: [ErrorEmbed.build('Je n\'ai pas cette permission')] });
}
```

---

## CATÉGORIE 6 — PERFORMANCE BASE DE DONNÉES (Sévérité : HAUTE)

### 6.1 Requêtes N+1

```javascript
// ❌ FATAL — 1 requête SQL par membre → 500 requêtes pour 500 membres
for (const member of members) {
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(member.id);
}

// ✅ OBLIGATOIRE — requête unique avec IN ou JOIN
// POURQUOI : SQLite sur disque, même en WAL, souffre des requêtes en boucle.
// 500 requêtes = 500 acquisitions de lock = goulot d'étranglement certain.
const ids = members.map(m => m.id);
const placeholders = ids.map(() => '?').join(',');
const stats = db.prepare(`SELECT * FROM user_stats WHERE user_id IN (${placeholders})`).all(...ids);
```

### 6.2 Prepared statements — Obligation absolue

```javascript
// ❌ INTERDIT — interpolation de chaîne = SQL injection
const result = db.prepare(`SELECT * FROM users WHERE id = '${userId}'`).get();

// ✅ OBLIGATOIRE — paramètres liés
// POURQUOI : better-sqlite3 compile le statement une fois et le réutilise.
// Perf x10 sur les requêtes répétées. Immunité SQL injection.
const getUser = db.prepare('SELECT * FROM user_stats WHERE user_id = ? AND guild_id = ?');
const result = getUser.get(userId, guildId);
```

### 6.3 Transactions pour les écritures multiples

```javascript
// ❌ LENT — chaque INSERT est une transaction implicite
members.forEach(m => db.prepare('INSERT INTO user_stats VALUES (?, ?)').run(m.id, 0));

// ✅ OBLIGATOIRE — transaction explicite
// POURQUOI : 1000 INSERTs isolés = 1000 fsync disque.
// 1000 INSERTs en transaction = 1 fsync. Différence : x100 sur SSD, x500 sur HDD.
const insertMany = db.transaction((members) => {
  const stmt = db.prepare('INSERT OR IGNORE INTO user_stats (user_id, guild_id) VALUES (?, ?)');
  for (const m of members) {
    stmt.run(m.id, guildId);
  }
});
insertMany(members);
```

---

## CATÉGORIE 7 — QUALITÉ CODE (Sévérité : MOYENNE à HAUTE)

### 7.1 Commentaires — Standard obligatoire

```javascript
// ❌ INTERDIT — commentaire qui explique le COMMENT
// On vérifie si le message commence par le préfixe
if (message.content.startsWith(prefix)) { ... }

// ✅ OBLIGATOIRE — commentaire qui explique le POURQUOI
// Préfixe vérifié en premier pour court-circuiter le traitement
// sur les 99% de messages non-commandes. Critique pour la perf
// sur des serveurs à fort volume de messages.
if (message.content.startsWith(prefix)) { ... }
```

### 7.2 Nommage — Règles non négociables

| Contexte | Convention | Exemple |
|---|---|---|
| Fichiers | kebab-case | `command-handler.js` ou PascalCase `CommandHandler.js` pour classes |
| Classes | PascalCase | `CommandHandler`, `EmbedBuilder` |
| Fonctions | camelCase | `loadCommands()`, `handleError()` |
| Constantes globales | UPPER_SNAKE | `MAX_CACHE_SIZE`, `DEFAULT_PREFIX` |
| Variables locales | camelCase | `guildId`, `userId` |
| Events Discord | camelCase string | `'messageCreate'`, `'guildMemberAdd'` |

### 7.3 Longueur de fonction — Règle des 40 lignes

```
Une fonction qui dépasse 40 lignes fait probablement trop de choses.
Exception acceptée : execute() d'une commande complexe avec justification.
Au-delà de 80 lignes : refactoring obligatoire, pas de discussion.
```

---

## GRILLE DE NOTATION AUDIT

Chaque fichier audité reçoit une notation :

```
[CRITIQUE]  → Bloque la livraison. Doit être corrigé avant présentation.
             Exemples : unhandled rejection, token hardcodé, eval(), API v13

[HAUTE]     → Doit être corrigé dans ce sprint.
             Exemples : collector sans timeout, rate limit non géré, N+1 SQL

[MOYENNE]   → À corriger avant la mise en prod.
             Exemples : commentaires manquants, nommage incohérent

[FAIBLE]    → Bonne pratique recommandée, non bloquante.
             Exemples : optimisation mineure, refactoring cosmétique

FORMAT DE RAPPORT OBLIGATOIRE :
AUDIT | fichier.js | [CRITIQUE x0] [HAUTE x2] [MOYENNE x1] [FAIBLE x0]
└── HAUTE #1 : Collector ligne 47 sans timeout → risque fuite mémoire
└── HAUTE #2 : guild.members.fetch() dans boucle ligne 83 → risque rate limit
└── MOYENNE #1 : Commentaires ligne 12-15 décrivent le COMMENT, pas le POURQUOI
```
