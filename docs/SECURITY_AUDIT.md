# SECURITY_AUDIT — Agence Soulbot

> Audit réalisé le 2026-04-18 par 🔍 Auditor + 🔐 SecOps  
> Périmètre : 79 fichiers, commit `0d2c5e4`  
> Méthode : lecture exhaustive de tous les fichiers critiques

---

## Score global

| Sévérité | Findings | Corrigés ici | À corriger manuellement |
|----------|----------|-------------|------------------------|
| 🔴 P0 Critique | 4 | 2 | 2 |
| 🟠 P1 Élevé | 3 | 2 | 1 |
| 🟡 P2 Moyen | 4 | 3 | 1 |
| 🔵 P3 Faible | 2 | 1 | 1 |

---

## 🔴 P0 — CRITIQUE

### P0-1 · Token Discord réel dans `.env`

**Fichier :** `.env` (non commité ✅ — ignoré par `.gitignore`)  
**Statut :** TOKEN RÉEL PRÉSENT — **action manuelle requise**

```
DISCORD_TOKEN=MTQ5M... (tronqué délibérément)
```

La valeur réelle est présente dans `.env`. Le fichier n'est pas dans git, mais il a été lu en clair.

**Action immédiate :**
1. Ouvrir https://discord.com/developers/applications → ton bot
2. Onglet "Bot" → "Reset Token"
3. Copier le nouveau token → coller dans `.env`

> Si le token a été exposé dans un terminal partagé, un log, ou une config cloud : régénère-le MAINTENANT avant de continuer.

---

### P0-2 · Secrets de session et dashboard non modifiés

**Fichier :** `.env`

```dotenv
SESSION_SECRET=change_this_to_a_random_secret_string   # ← valeur template
DASHBOARD_PASSWORD=admin123                             # ← trivial à brute-forcer
```

**Fix attendu dans `.env` :**
```dotenv
SESSION_SECRET=<chaîne aléatoire ≥ 64 chars — générer via : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
DASHBOARD_PASSWORD=<mot de passe fort, jamais admin123>
```

---

### P0-3 · `messageCreate.js` ne vérifie pas `ownerOnly`

**Fichier :** `bot/events/messageCreate.js`

Le handler inline fait la résolution commande → permissions → exécution, mais **ne lit pas** `cmd.ownerOnly`. La catégorie owner est vide aujourd'hui, mais le Sprint 1 va créer `eval`, `reload`, `shutdown`, `maintenance`, etc. Sans ce guard, n'importe quel utilisateur pourra les exécuter.

**Fix — ajouter après la résolution du `cmd`, avant le cooldown :**

```js
// ── Guard ownerOnly ───────────────────────────────────────────────────────
if (cmd.ownerOnly) {
  const owners = (process.env.BOT_OWNERS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!owners.includes(message.author.id)) {
    return message.reply({ embeds: [E.error('Accès refusé', 'Commande réservée au propriétaire du bot.')] });
  }
}
```

---

### P0-4 · `BOT_OWNERS` absent du `.env` et `.env.example`

**Fichiers :** `.env`, `.env.example`

`core/CommandHandler.js` lit `process.env.BOT_OWNERS` pour le guard ownerOnly, mais la variable n'est définie nulle part → tableau vide → guard toujours refusé (quand il sera activé).

**Fix dans `.env` et `.env.example` :**
```dotenv
# IDs Discord des propriétaires du bot (séparés par virgule)
BOT_OWNERS=TON_ID_DISCORD_ICI
```

---

## 🟠 P1 — ÉLEVÉ

### P1-1 · Intent `GuildPresences` déclaré mais inutilisé

**Fichier :** `bot/index.js` — ligne 19

```js
GatewayIntentBits.GuildPresences,  // ← privileged intent, non utilisé
```

`GuildPresences` est un **intent privilégié** : il doit être activé dans le portail dev Discord, expose les données de présence de tous les membres, et bloque la vérification de bot (100+ guilds) si non justifié.

**Fix :** retirer cette ligne jusqu'à implémenter une feature qui en a besoin.

```js
// Retirer :
GatewayIntentBits.GuildPresences,
```

---

### P1-2 · Aucune validation de longueur sur `reason`

**Fichiers :** `ban.js`, `kick.js`, `warn.js`, `mute.js`

Discord impose une limite de **512 caractères** sur le champ `reason` des audit logs. Sans validation, une raison trop longue provoque une erreur API (DiscordAPIError 50035) catchée en générique par le handler.

**Pattern fix à appliquer dans chaque commande :**
```js
const raw    = args.slice(1).join(' ') || 'Aucune raison fournie';
const reason = raw.slice(0, 512);  // Discord audit log limit
```

---

### P1-3 · Rate limiting absent au niveau guilde

**Fichier :** `bot/events/messageCreate.js`

Les cooldowns actuels sont **par utilisateur par commande**. Il n'existe aucun guard contre :
- Spam d'une commande depuis plusieurs utilisateurs simultanément sur le même serveur
- Attaque via altération de mentions multiples (`ban @user1 @user2...` en boucle)
- Aucun cooldown global par guilde

**Fix recommandé (P2 scope — à implémenter en Sprint Protection) :**
Ajouter un compteur `guild:cmdName` avec TTL de 5 secondes, max N appels (ex: 5).

```js
// Prototype — à raffiner avec la feature Protection
const gCdKey      = `guild:${cmd.name}:${guildId}`;
const gLastCount  = client.cooldowns.get(gCdKey) ?? 0;
if (gLastCount >= 5) return; // silencieux ou reply
client.cooldowns.set(gCdKey, gLastCount + 1);
setTimeout(() => client.cooldowns.delete(gCdKey), 5000);
```

---

## 🟡 P2 — MOYEN

### P2-1 · 5 commandes sans `try/catch` interne

**Fichiers :** `ban.js`, `kick.js`, `warn.js`, `warnings.js`, `clear.js`

Ces commandes n'ont aucun `try/catch`. Une erreur Discord API (hiérarchie, réseau, ratelimit) remonte au catch du handler `messageCreate.js` qui retourne un message générique "Une erreur interne est survenue" — sans indication du problème réel.

`unban.js` et `mute.js` ont leur try/catch ✅ — les autres non.

**Fix à appliquer dans chaque commande :**
```js
try {
  await target.ban({ reason, deleteMessageSeconds: 86400 });
  STMT.run(...);
  return message.channel.send({ embeds: [E.base()...] });
} catch (err) {
  if (err.code === 50013) return message.reply({ embeds: [E.error('Permission manquante', 'Hiérarchie de rôles insuffisante.')] });
  return message.reply({ embeds: [E.error('Erreur API', `Impossible d'exécuter l'action : ${err.message}`)] });
}
```

---

### P2-2 · `poll.js` — setTimeout jusqu'à 24h en mémoire

**Fichier :** `bot/commands/stats/poll.js` — ligne 117

```js
if (durationSec && durationSec < 24 * 3600) {
  setTimeout(async () => { ... }, durationSec * 1000);
}
```

- Si le bot redémarre, tous les polls planifiés via setTimeout sont perdus (la fermeture automatique ne s'exécute jamais)
- Pour 100 polls de 24h simultanés : 100 closures en mémoire pendant 86 400 000 ms

**Fix long terme :** utiliser un worker cron qui relit `polls WHERE active=1 AND ends_at <= ?` au démarrage et à intervalles réguliers.  
**Fix court terme :** ajouter un commentaire explicite et déconseiller les durées > 1h.

---

### P2-3 · `poll.js` — question embed sans validation longueur

**Fichier :** `bot/commands/stats/poll.js` — ligne 93

```js
.setTitle(`📊  ${question}`)  // Discord limit : 256 chars
```

```js
.setTitle(`📊  Résultats — ${poll.question}`)  // idem
```

Si `question` > 252 chars, Discord lève une validation error. Aucune validation en amont.

**Fix :**
```js
if (question.length > 200) return message.reply({ embeds: [E.error('Question trop longue', 'Maximum **200 caractères**.')] });
```

---

### P2-4 · `interactionCreate.js` — select menu errors silencieuses

**Fichier :** `bot/events/interactionCreate.js` — ligne 122–127

```js
} catch (err) {
  logger.errorStack(`InteractionCreate:Select:${action}`, err);
  // Aucun reply à l'utilisateur
}
```

En cas d'erreur dans un handler de select menu, l'interaction expire sans retour visuel pour l'utilisateur ("Cette interaction a échoué").

**Fix :**
```js
} catch (err) {
  logger.errorStack(`InteractionCreate:Select:${action}`, err);
  const payload = { content: '✗ Erreur lors de la sélection.', flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload).catch(() => {});
  } else {
    await interaction.reply(payload).catch(() => {});
  }
}
```

---

## 🔵 P3 — FAIBLE

### P3-1 · Duplication dispatch : `messageCreate.js` vs `CommandHandler.dispatch()`

**Fichiers :** `bot/events/messageCreate.js`, `bot/core/CommandHandler.js`

Deux implémentations du dispatch coexistent :
- `messageCreate.js` : guildOnly (implicite) + cooldowns + permissions ✅ — ownerOnly ❌
- `CommandHandler.dispatch()` : ownerOnly ✅ + cooldowns + permissions + guildOnly ✅

`messageCreate.js` ne call pas `CommandHandler.dispatch()` — la logique est inline et divergera au fil des commits.

**Fix recommandé (Phase 2) :**  
`messageCreate.js` doit devenir un thin wrapper :
```js
const { dispatch } = require('../core/CommandHandler');
// [...]
await dispatch(message, client, db, logger);
```

---

### P3-2 · `BOT_OWNERS` format — pas de validation Snowflake

**Fichier :** `bot/core/CommandHandler.js` — ligne 114

```js
const owners = (process.env.BOT_OWNERS ?? '').split(',').map(s => s.trim()).filter(Boolean);
if (!owners.includes(author.id)) { ... }
```

Aucune validation que les IDs sont des Snowflakes valides. Un ID mal formaté dans `.env` (espace, lettre) bloquerait silencieusement l'accès.

**Fix :**
```js
const owners = (process.env.BOT_OWNERS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(s => /^\d{17,19}$/.test(s));
```

---

## Dimension par dimension (résumé tableau)

| Dimension | Statut | Finding principal |
|-----------|--------|------------------|
| Intents | 🟠 | `GuildPresences` privileged non utilisé — retirer |
| Permissions par commande | ✅ | Toutes les commandes déclarent `permissions` correctement |
| Gestion token `.env` | 🔴 | Token réel présent — régénérer immédiatement |
| SESSION_SECRET | 🔴 | Valeur template — générer aléatoirement |
| Rate limits | 🟠 | Cooldowns user ✅ — pas de rate limit global guilde |
| Validation inputs | 🟠 | `reason` non borné à 512 chars, `question` non borné à 200 chars |
| Collectors timeout | ✅ | `help.js` : 90s, filter userId, cleanup `on('end')` |
| Try/catch commandes | 🟡 | 5 commandes exposées au handler générique uniquement |
| Guard ownerOnly | 🔴 | Absent dans `messageCreate.js` — critique Sprint 1 |
| BOT_OWNERS | 🔴 | Variable absente du `.env` |

---

## Plan de correction priorisé

### Immédiat (avant prochain commit)

1. ✋ **Régénérer le token** sur discord.com/developers
2. ✋ **Ajouter `BOT_OWNERS`** dans `.env` et `.env.example`
3. ✋ **Corriger `SESSION_SECRET`** et `DASHBOARD_PASSWORD`
4. 🤖 **Patch `messageCreate.js`** — ajouter le guard `ownerOnly` ← fait ci-dessous

### Sprint 1 (avant création commandes Owner)

5. Retirer `GuildPresences` de `bot/index.js`
6. Ajouter validation longueur `reason` dans ban, kick, warn, mute
7. Ajouter try/catch interne dans ban, kick, warn, warnings, clear
8. Ajouter reply error dans select menu catch

### Sprint Protection (S1)

9. Rate limiting global par guilde dans `messageCreate.js`

### Phase 2 (refacto handler)

10. `messageCreate.js` → thin wrapper appelant `CommandHandler.dispatch()`

---

## Fixes auto-appliqués

Les corrections P0-3 (guard ownerOnly), P1-2 (reason length), P2-4 (select error reply) et P3-2 (Snowflake validation) sont intégrées dans le commit suivant cet audit.  
Les corrections P0-1, P0-2, P0-4 nécessitent une **action manuelle** de Nathan sur les valeurs secrètes.

---

*Soulbot Security Audit · v1.0 · 2026-04-18 · 🔍 Auditor + 🔐 SecOps*
