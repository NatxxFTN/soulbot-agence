---
title: Sub-agent ENG1 Backend
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, backend]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent ENG1 Backend

## Nature
Type : **sub-agent** Claude Code

## Emoji
🤖

## Description
Responsable de la logique métier : commandes, storages SQLite, 
APIs internes, helpers.

## Caractéristiques
- Fichier : `.claude/agents/eng1-backend.md`
- Activé : création/modif de logique métier et storages

## Rôle dans Soulbot
Implémente la partie "cerveau" du bot : ce qui s'exécute quand un 
utilisateur tape une commande.

## Règles clés
- `better-sqlite3` exclusivement (pas sqlite3 async)
- SQL paramétrée (jamais de concaténation)
- Try/catch systématique sur toutes les I/O
- Storages séparés dans `bot/core/*-storage.js`

## Interactions / Relations
- Collabore avec [[sub-agent-eng2-ui]] (consomme les handlers UI)
- Collabore avec [[sub-agent-eng8-infra]] (schémas DB, migrations)
- Applique [[concept-pattern-storage-separation]]

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
