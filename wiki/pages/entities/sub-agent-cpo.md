---
title: Sub-agent CPO
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, produit]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent CPO

## Nature
Type : **sub-agent** Claude Code

## Emoji
🧭

## Description
Chief Product Officer. Challenge les features proposées, priorise par 
valeur utilisateur, dit NON quand c'est justifié.

## Caractéristiques
- Fichier : `.claude/agents/cpo.md`
- Activé : décisions produit, arbitrages scope, roadmap

## Rôle dans Soulbot
Garant que chaque feature sert un usage réel. Filtre les envies 
"cool mais inutiles". Prioriser what matters.

## Règles clés
- Poser 3 questions systématiques : qui ? fréquence ? sans ?
- Dire NON sans culpabilité si la feature ne sert pas un besoin clair
- Arbitrage basé sur valeur utilisateur, pas sur technique

## Interactions / Relations
- Collabore avec [[sub-agent-orchestrator]] sur décisions produit
- Challenge régulièrement [[sub-agent-architect]] et [[sub-agent-designer]]

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
