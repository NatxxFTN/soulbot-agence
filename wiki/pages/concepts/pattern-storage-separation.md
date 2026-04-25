---
title: Pattern séparation storage / logique métier
type: concept
created: 2026-04-24
updated: 2026-04-24
tags: [concept, architecture, db]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Pattern séparation storage / logique métier

## Définition
Séparation stricte entre les **commandes** (logique métier) et les 
**storages** (accès DB). Les commandes ne font JAMAIS de SQL direct ; 
elles consomment des fonctions exposées par `bot/core/*-storage.js`.

## Pourquoi c'est important (pour Soulbot)
- Testabilité : mocker le storage pour tester la logique
- Maintenabilité : changer la DB n'impacte que les storages
- Lisibilité : les commandes se lisent comme du pseudo-code
- Sécurité : toutes les queries paramétrées au même endroit

## Principes clés
- **Storages dans `bot/core/*-storage.js`** (ex: 
  `tickets-storage.js`, `custom-commands-storage.js`)
- **SQL paramétrée** uniquement (jamais de concaténation)
- Les storages exposent des **fonctions nommées** (pas des queries)
- Les commandes importent et consomment les fonctions

## Comment on l'applique dans Soulbot
```js
// bot/core/tickets-storage.js
function createTicket(guildId, userId, channelId) {
  return db.prepare('INSERT INTO tickets VALUES (?, ?, ?)').run(...)
}

// bot/commands/ticket/open.js
const { createTicket } = require('../../core/tickets-storage');
// ... utilise createTicket, jamais de db.prepare() ici
```

## Concepts liés
- [[concept-pattern-customid]]

## Entités associées
- [[sub-agent-eng1-backend]] (enforce le pattern)
- [[sub-agent-eng8-infra]] (conçoit les schémas)
- [[custom-commands]]
- [[ticket-v2]]

## Questions ouvertes
- Futur ORM léger (drizzle, kysely) ?
- Tests automatisés des storages ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
