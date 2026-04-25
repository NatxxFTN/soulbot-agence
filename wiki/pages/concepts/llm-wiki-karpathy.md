---
title: LLM Wiki (pattern Karpathy)
type: concept
created: 2026-04-24
updated: 2026-04-24
tags: [concept, memory, ai]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: medium
---

# LLM Wiki (pattern Karpathy)

## Définition
Pattern où un LLM maintient une **base de connaissance markdown 
persistante** au lieu de faire du RAG à chaque requête. Le wiki 
compound : chaque session enrichit les pages existantes, crée de 
nouvelles entités, cross-référence.

## Pourquoi c'est important (pour Soulbot)
- Mémoire projet qui survit aux sessions Claude.ai
- Exploration = enrichissement, pas perte dans l'historique chat
- Indépendance vs outil IA (markdown brut, local, compatible Obsidian)
- Base pour présentation tuteur stage

## Principes clés

### 3 couches d'architecture
1. **Raw sources** (`wiki/raw/`) — immutable, lecture seule pour l'IA
2. **Pages wiki** (`wiki/pages/`) — maintenues par l'IA
3. **Schema** (`wiki/SCHEMA.md`) — règles et conventions

### 4 opérations canoniques
- **INGEST** : intégrer une nouvelle source dans le wiki
- **QUERY** : répondre à une question en citant les pages
- **SAVE** : classer la dernière réponse comme page permanente
- **LINT** : audit santé périodique

## Comment on l'applique dans Soulbot
- Structure `wiki/` complète créée le 2026-04-24
- 4 slash commands : `/wiki-ingest`, `/wiki-query`, `/wiki-save`, 
  `/wiki-lint` (+ alias courts)
- 5 templates markdown (concept, entity, decision, synthesis, 
  source-summary)
- Frontmatter YAML + liens Obsidian `[[...]]`

## Concepts liés
- [[concept-polyphonie-agents]]
- [[concept-freinage-mentor]]

## Entités associées
- [[fichier-claude-md]]

## Questions ouvertes
- Comment scaler à 1000+ pages sans perte de cohérence ?
- LINT automatique (cron) vs manuel (`/wiki-lint`) ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
- [[2026-04-24-llm-wiki-phase-a]]
- Référence externe : projet BenBktech/Un-second-cerveau-Obsidian-Claude
