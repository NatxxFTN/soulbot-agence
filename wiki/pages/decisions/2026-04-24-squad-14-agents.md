---
title: Squad polyphonique 14 agents
type: decision
created: 2026-04-24
updated: 2026-04-24
tags: [decision, adr, agents]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# ADR: Squad polyphonique à 14 agents

**Date** : 2026-04-24
**Décideurs** : Nathan (+ Claude Code)
**Status** : **active**

## Contexte
CLAUDE.md v1.4 définissait une squad de 45 agents (18 principaux + 
8 testeurs + 5 C&V + 4 C&S + 6 C&G + 8 Engineering). Trop pour rester 
gérable dans la fenêtre de contexte Claude Code.

## Décision
Réduire à une **squad de 14 agents polyphoniques** spécialisés, avec 
règle : **minimum 3 agents mobilisés à chaque action complexe**.

## Alternatives considérées

### Alt 1 : 1 agent générique (Claude seul)
- Pros : simple
- Cons : pas de diversité de perspectives, zéro challenge interne
- **Rejeté** : la polyphonie est une force

### Alt 2 : 45 agents v1.4
- Pros : spécialisation maximale
- Cons : saturation contexte, impossibilité de tous les invoquer, 
  overhead organisationnel
- **Rejeté** : moins c'est plus

## Conséquences

### Positives
- Chaque action complexe mobilise un mix de perspectives
- Sub-agents dédiés pour profondeur à la demande
- Règle polyphonie facile à vérifier (`✅ X agents actifs`)
- Scalable : ajout ponctuel de sub-agents supplémentaires possible

### Négatives / Trade-offs
- Perte des squads spécialisées v1.4 (Testeurs, C&V, etc.)
- Certains domaines (tests, content) moins incarnés — compensé par 
  les sub-agents polyvalents (Lead Testeur, Copywriter)

### Action items découlant
- [x] 15 sub-agents dans `.claude/agents/` (orchestrator, cpo, architect, 
  designer, web-designer, copywriter, eng1-backend, eng2-ui, 
  eng6-devops, eng8-infra, lead-tester, auditor, bug-triage, secops, 
  mentor)
- [x] CLAUDE.md section "Squad polyphonique (14 agents)"

## Note
La squad compte en réalité **15 sub-agents** dans `.claude/agents/` 
(l'Orchestrateur étant compté séparément). CLAUDE.md parle de "14 
agents" pour le décompte hors Orchestrateur.

## Liens
- [[fichier-claude-md]]
- [[concept-polyphonie-agents]]
- [[2026-04-24-pattern-sub-agents]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
