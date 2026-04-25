---
title: Adoption pattern LLM Wiki (Phase A)
type: decision
created: 2026-04-24
updated: 2026-04-24
tags: [decision, adr, memory]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# ADR: Adoption du pattern LLM Wiki de Karpathy

**Date** : 2026-04-24
**Décideurs** : Nathan (+ Claude Code, freinage Mentor)
**Status** : **active**

## Contexte
Besoin d'une mémoire persistante projet. Les conversations Claude.ai 
accumulent énormément d'info qui se perd dans l'historique chat. 
Nathan a mentionné le pattern LLM Wiki inspiré de Karpathy et 
l'approche BenBktech.

## Décision
Implémenter le pattern **LLM Wiki** en 2 phases :

- **Phase A** — Infrastructure seule : structure `wiki/`, SCHEMA.md, 
  templates, slash commands. **Livrée 2026-04-24.**
- **Phase B** — Ingestion initiale des sources existantes. **À faire 
  par batches contrôlés** (décision Mentor acceptée).

## Alternatives considérées

### Alt 1 : Notion
- Pros : collaboration, UI
- Cons : **lock-in propriétaire**, pas intégrable Obsidian, pas 
  markdown natif
- **Rejeté** : enfermement inacceptable

### Alt 2 : Docs simples dans docs/
- Pros : léger
- Cons : pas de cross-référencement, pas de synthèse automatique, 
  pas de pattern de maintenance
- **Rejeté** : docs ≠ wiki

## Conséquences

### Positives
- Structure `wiki/` (raw/, pages/, templates/, SCHEMA.md)
- 4 opérations Karpathy : INGEST / QUERY / SAVE / LINT (+alias courts)
- 5 templates : concept, entity, decision, synthesis, source-summary
- Compat Obsidian parfaite (frontmatter YAML + `[[liens]]`)
- Mémoire projet persistante et interrogeable

### Négatives / Trade-offs
- Maintenance régulière nécessaire (`/wiki-lint` périodique)
- Phase B à faire (ingestions initiales) — découpée volontairement 
  pour éviter l'empilement non-testé

### Action items découlant
- [x] Phase A livrée
- [x] /wiki-save ajouté (2026-04-24)
- [x] Second cerveau massif créé (2026-04-24, Option B choisie)
- [ ] /wiki-lint à lancer périodiquement
- [ ] Tests Obsidian (vault à la racine du projet requis)

## Liens
- [[concept-llm-wiki-karpathy]]
- [[fichier-claude-md]] (section LLM Wiki)

## Sources
- [[source-2026-04-23-24-session-initiale]]
