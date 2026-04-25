---
title: Sub-agent ENG8 Infra
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, infra]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent ENG8 Infra

## Nature
Type : **sub-agent** Claude Code

## Emoji
🔧

## Description
Responsable infrastructure : performance DB, migrations SQL, 
backups, scripts système.

## Caractéristiques
- Fichier : `.claude/agents/eng8-infra.md`
- Activé : schémas DB, migrations, optimisations perf, backups

## Rôle dans Soulbot
Garant que la DB SQLite reste rapide et fiable. Migrations propres, 
pas de DROP TABLE brutaux.

## Règles clés
- `PRAGMA journal_mode=WAL` pour concurrence lectures
- INDEX obligatoire dès > 100 lignes sur colonnes filtrées
- Toute migration avec `CREATE TABLE IF NOT EXISTS`
- Backup automatique avant opérations destructives

## Interactions / Relations
- Collabore avec [[sub-agent-eng1-backend]] (schémas de tables)
- Collabore avec [[sub-agent-eng6-devops]] (déploiement)

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
