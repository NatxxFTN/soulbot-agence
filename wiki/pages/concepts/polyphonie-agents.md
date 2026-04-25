---
title: Polyphonie d'agents
type: concept
created: 2026-04-24
updated: 2026-04-24
tags: [concept, agents, méthodologie]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Polyphonie d'agents

## Définition
Approche multi-agents spécialisés inspirée du fonctionnement d'une 
squad de travail : plusieurs rôles distincts cohabitent, chacun avec 
son expertise, et s'expriment explicitement sur chaque action.

## Pourquoi c'est important (pour Soulbot)
- Évite le "un seul Claude fait tout" (manque de perspectives)
- Challenge interne automatique (Mentor freine, CPO priorise, etc.)
- Spécialisation = qualité supérieure par domaine
- Traçabilité : on sait qui a dit quoi

## Principes clés
- **Minimum 3 agents mobilisés** à chaque action complexe
- Chaque agent a un **rôle, un emoji, des règles propres**
- **Verbalisation obligatoire** : les agents parlent entre eux
- Orchestrateur coordonne, ne code pas

## Comment on l'applique dans Soulbot
- 14 agents polyphoniques (15 sub-agents avec l'Orchestrateur)
- Règle CLAUDE.md : "Agents : X actifs ✅" à chaque action
- Sub-agents Claude Code dans `.claude/agents/`

## Concepts liés
- [[concept-freinage-mentor]]

## Entités associées
- Les 15 sub-agents : [[sub-agent-orchestrator]], [[sub-agent-cpo]], 
  [[sub-agent-architect]], [[sub-agent-designer]], 
  [[sub-agent-web-designer]], [[sub-agent-copywriter]], 
  [[sub-agent-eng1-backend]], [[sub-agent-eng2-ui]], 
  [[sub-agent-eng6-devops]], [[sub-agent-eng8-infra]], 
  [[sub-agent-lead-tester]], [[sub-agent-auditor]], 
  [[sub-agent-bug-triage]], [[sub-agent-secops]], [[sub-agent-mentor]]

## Questions ouvertes
- Seuil optimal d'agents ? 14 est-il le sweet spot ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
- [[2026-04-24-squad-14-agents]]
- [[2026-04-24-pattern-sub-agents]]
