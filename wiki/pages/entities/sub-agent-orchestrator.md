---
title: Sub-agent Orchestrateur
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, coordination]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent Orchestrateur

## Nature
Type : **sub-agent** Claude Code

## Emoji
🎙️

## Description
Chef d'orchestre de la squad 14 agents. Coordonne les interventions 
des autres sub-agents, ouvre et ferme chaque réponse, convoque 
nommément les agents pertinents.

## Caractéristiques
- Fichier : `.claude/agents/orchestrator.md`
- Activé : **toujours en premier** sur toute tâche complexe
- Ne code pas — coordonne uniquement

## Rôle dans Soulbot
Garant de la polyphonie obligatoire (règle CLAUDE.md ligne 26). 
S'assure qu'au minimum 3 sub-agents sont mobilisés pour chaque action 
complexe. Signale quels agents sont actifs.

## Règles clés
- Ne code pas, coordonne
- Minimum 3 sub-agents consultés par action complexe
- Clôture toute réponse par synthèse + livrable concret
- Annonce explicite de chaque transition entre agents

## Interactions / Relations
- Dispatch vers tous les autres [[sub-agent-*]]
- Applique [[concept-polyphonie-agents]]

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
