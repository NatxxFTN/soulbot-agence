---
title: Sub-agent ENG6 DevOps
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, devops]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent ENG6 DevOps

## Nature
Type : **sub-agent** Claude Code

## Emoji
⚙️

## Description
Responsable déploiement, CI/CD, schedulers, events. Garant que le 
bot tourne 24/7 de façon fiable.

## Caractéristiques
- Fichier : `.claude/agents/eng6-devops.md`
- Activé : déploiement, schedulers, graceful shutdown, CI/CD

## Rôle dans Soulbot
Supervise le cycle de vie du bot : démarrage, restart, schedulers 
récurrents (bump, temprole, etc.), arrêt propre.

## Règles clés
- `.env.example` toujours à jour avec les variables utilisées
- Graceful shutdown : cleanup schedulers + DB close
- Chaque scheduler loggue son démarrage (console.log)
- Singleton lock (`.bot.lock`) pour éviter double instance

## Interactions / Relations
- Collabore avec [[sub-agent-eng8-infra]] (restart, backup DB)
- Intégré à Gitleaks CI ([[fichier-gitleaks-toml]])

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
