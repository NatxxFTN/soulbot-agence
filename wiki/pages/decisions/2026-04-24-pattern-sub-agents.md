---
title: Pattern sub-agents .claude/agents/ vs fichiers racine
type: decision
created: 2026-04-24
updated: 2026-04-24
tags: [decision, adr, agents]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# ADR: Pattern sub-agents dans .claude/agents/

**Date** : 2026-04-24
**Décideurs** : Nathan (+ Claude Code)
**Status** : **active**

## Contexte
Nathan voulait initialement placer **14 fichiers `.md` à la racine** 
du projet (un par agent) pour leur donner une présence visible. 
Intuition : éviter la dégradation du contexte sur long projet.

## Décision
Utiliser le **pattern officiel Claude Code sub-agents** : fichiers 
dans `.claude/agents/`, activés À LA DEMANDE selon le contexte.

## Alternatives considérées

### Alt 1 : 14 fichiers .md à la racine
- Pros : visibilité max, intuition Nathan satisfaite
- Cons : saturation du contexte de Claude Code à CHAQUE prompt 
  (tous les .md racine sont lus), overhead de maintenance, pollution 
  visuelle de la racine
- **Rejeté** : la présence ≠ l'efficacité

### Alt 2 : Pattern sub-agents Claude Code
- Pros : activation ciblée (le sub-agent est invoqué quand pertinent), 
  pas de saturation contexte, isolation propre
- Cons : moins "visible" à l'œil nu
- **Retenu** : c'est le standard Claude Code

## Conséquences

### Positives
- **15 fichiers** dans `.claude/agents/` : orchestrator, cpo, architect, 
  designer, web-designer, copywriter, eng1-backend, eng2-ui, 
  eng6-devops, eng8-infra, lead-tester, auditor, bug-triage, secops, 
  mentor
- Contexte Claude Code reste maîtrisé
- Activation à la demande = pertinence maximale

### Négatives / Trade-offs
- Moins "visible" pour Nathan
- Compensé par la section "Sub-agents spécialisés" de CLAUDE.md qui 
  liste tous les agents + leur rôle

### Action items découlant
- [x] 15 sub-agents créés dans `.claude/agents/`
- [x] Section dédiée dans CLAUDE.md

## Liens
- [[2026-04-24-squad-14-agents]]
- [[concept-polyphonie-agents]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
