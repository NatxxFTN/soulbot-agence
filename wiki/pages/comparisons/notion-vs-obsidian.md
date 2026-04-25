---
title: Notion vs Obsidian
type: comparison
created: 2026-04-24
updated: 2026-04-24
tags: [comparison, outils, documentation]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Notion vs Obsidian

## TL;DR
Obsidian choisi pour le LLM Wiki Soulbot car markdown local, pas de 
lock-in, graph view, compatible avec pattern `[[liens]]` et 
frontmatter YAML.

## Axes de comparaison

| Critère | Notion | Obsidian |
|---|---|---|
| **Stockage** | Cloud propriétaire | Local (markdown brut) |
| **Format** | Format proprio (export complexe) | Markdown standard |
| **Liens internes** | Bidirectionnels | `[[liens]]` bidirectionnels |
| **Collaboration** | Temps réel | Sync via fichiers (Git, iCloud, etc.) |
| **Lock-in** | Fort (export limité) | Aucun (fichiers .md) |
| **Graph view** | Non | Oui (natif) |
| **Plugins** | Peu extensible | Écosystème riche |
| **Prix** | Freemium (limites) | Gratuit (sync payant optionnel) |
| **Compat agents IA** | Via API (complexe) | Natif (lecture fichiers) |

## Choix Soulbot : Obsidian
- **Raison 1** : compat pattern LLM Wiki (markdown + frontmatter + 
  `[[liens]]`)
- **Raison 2** : pas de lock-in
- **Raison 3** : graph view essentiel pour visualiser le second cerveau
- **Raison 4** : Claude Code peut lire/écrire les fichiers directement

## Trade-off accepté
- Pas de collaboration temps réel (Nathan solo sur Soulbot de toute façon)
- Sync multi-device à mettre en place (iCloud ou Git)

## Conclusions
Pour un projet de second cerveau piloté par LLM, Obsidian est 
objectivement supérieur. Notion serait pertinent uniquement si 
collaboration humaine intense.

## [À VALIDER NATHAN]
- Utilises-tu Notion en parallèle (perso, études) ?
- Plan de sync Obsidian multi-device si applicable ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
- [[concept-llm-wiki-karpathy]]
