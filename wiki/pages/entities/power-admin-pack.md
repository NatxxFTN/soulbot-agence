---
title: Power Admin Pack
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [pack, prévu, draft]
sources: [source-2026-04-23-24-session-initiale]
status: draft
confidence: low
---

# Power Admin Pack

## Nature
Type : **pack prévu** — ~30 commandes power admin

## Description
Pack de commandes admin avancées pour gestion de gros serveurs.

## Commandes mentionnées
- `voicemove` — déplacer un utilisateur en vocal
- `voicekick` — éjecter un utilisateur d'un vocal
- `cleanup` — nettoyage massif de messages
- `bringall` — amener tous les users dans un vocal
- `massiverole` — attribuer/retirer un rôle à de nombreux users
- etc. (~30 au total)

## Status
**Prévu · pas encore développé**

## [À VALIDER NATHAN]
- Liste exhaustive des ~30 commandes ?
- Précisions sur `cleanup` : tout le serveur ? un salon ? âge des messages ?
- `massiverole` : pagination / batching pour respecter rate limits ?

## Interactions / Relations
- Respect strict [[permissions-3-niveaux]] (BotOwner + Buyer seulement ?)
- Requiert rate limiting rigoureux ([[sub-agent-secops]])

## État
Status : **prévu · non démarré**

## Sources
- [[source-2026-04-23-24-session-initiale]]
