---
title: better-sqlite3 choix de driver SQLite
type: decision
created: 2026-04-24
updated: 2026-04-24
tags: [decision, adr, db]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: medium
---

# ADR: better-sqlite3 exclusivement (pas sqlite3 async)

**Date** : 2026-04-24 (documentation ADR rétroactive)
**Décideurs** : Nathan (décision historique, non datée précisément)
**Status** : **active**

## Contexte
Soulbot utilise SQLite comme DB embarquée. Deux drivers principaux 
existent dans l'écosystème Node.js :
- `sqlite3` (async, callback-based)
- `better-sqlite3` (sync, WAL, simple API)

## Décision
**`better-sqlite3` exclusivement** (version `^12.8.0` au 2026-04-24).

## Alternatives considérées

### Alt 1 : sqlite3 (async)
- Pros : async natif, pattern Node.js classique
- Cons : plus verbeux (callbacks/promises partout), perf moindre 
  sur les opérations simples
- **Rejeté** : la complexité n'apporte rien pour un bot Discord 
  single-process

### Alt 2 : better-sqlite3
- Pros : API synchrone simple, excellent pour embedded use-case, 
  support WAL, performances solides
- Cons : bloque l'event loop sur très grosses requêtes (non-issue 
  pour Soulbot)
- **Retenu**

## Conséquences

### Positives
- Code DB plus lisible (sans callback hell)
- Pattern synchrone cohérent avec le reste du bot
- Support WAL pour concurrence lectures
- Bibliothèque mature et maintenue

### Négatives / Trade-offs
- Si un jour Soulbot devient multi-process, réévaluation nécessaire
- Bloque event loop sur queries très lourdes → à surveiller

### Action items découlant
- [x] Installation dans `package.json`
- [x] Storages dans `bot/core/*-storage.js` l'utilisent
- [ ] Documenter les règles (PRAGMA WAL, INDEX obligatoire) dans 
  AGENTS.md [À VALIDER NATHAN]

## [À VALIDER NATHAN]
Cette décision est antérieure à la session documentation 2026-04-24. 
J'ai documenté en ADR **rétroactif** sur la base de `package.json`. 
Confirme-tu que c'était bien un choix conscient (et pas un simple 
"cp du fork samy/orange") ?

## Liens
- [[fichier-claude-md]]
- [[sub-agent-eng1-backend]]
- [[sub-agent-eng8-infra]]

## Sources
- Observation directe de `package.json` (`"better-sqlite3": "^12.8.0"`)
- [[source-2026-04-23-24-session-initiale]]
