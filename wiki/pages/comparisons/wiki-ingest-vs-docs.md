---
title: docs/ vs wiki/
type: comparison
created: 2026-04-24
updated: 2026-04-24
tags: [comparison, documentation]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# docs/ vs wiki/

## TL;DR
`docs/` et `wiki/` sont **complémentaires** dans Soulbot : `docs/` 
est la documentation officielle stable éditée par Nathan, `wiki/` est 
la base de connaissance vivante maintenue par Claude Code.

## Axes de comparaison

| Critère | docs/ | wiki/ |
|---|---|---|
| **Édité par** | Nathan (à la main) | Claude Code (via slash commands) |
| **Fréquence MAJ** | Faible (stable) | Haute (à chaque ingest/save) |
| **Contenu** | README, ARCHITECTURE, ROADMAP, CHANGELOG, BRAIN, FAQ | Entities, concepts, decisions, syntheses, comparisons, raw sources |
| **Structure** | Plate (~10 fichiers) | Taxonomisée (5 sous-dossiers `pages/`) |
| **Sources** | Pas formalisées | `wiki/raw/` immuable |
| **Cross-linking** | Libre | Obligatoire (`[[liens]]`) |
| **Frontmatter** | Variable | Systématique (YAML) |

## Ce qui va dans docs/
- Documentation externe (pour humains tiers)
- Fichiers officiels (README.md, CHANGELOG.md)
- Process docs (support-playbook, tone-of-voice)
- ADR formels (quand le projet mûrit)

## Ce qui va dans wiki/
- Exploration de concepts
- Résumés de conversations Claude.ai
- Synthèses ad-hoc via `/wiki-save`
- ADR techniques (`2026-04-24-*.md`)
- Cross-references denses

## Conclusions
Les deux cohabitent : **docs/** est la vitrine, **wiki/** est l'atelier. 
La ligne de démarcation : **stabilité et public visé**.
- Si un visiteur externe de GitHub doit le lire → `docs/`
- Si Nathan ou Claude a besoin de le retrouver plus tard → `wiki/`

## Pages liées
- [[fichier-claude-md]]
- [[concept-llm-wiki-karpathy]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
