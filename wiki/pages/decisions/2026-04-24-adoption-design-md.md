---
title: Adoption format Google Labs pour DESIGN.md
type: decision
created: 2026-04-24
updated: 2026-04-24
tags: [decision, adr, design]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# ADR: Adoption du format Google Labs DESIGN.md

**Date** : 2026-04-24
**Décideurs** : Nathan (+ Claude Code)
**Status** : **active**

## Contexte
Besoin de centraliser les règles visuelles du projet (tokens couleurs, 
typographie, spacing, components) dans un format lisible à la fois 
par les humains et les agents IA.

## Décision
Adopter le format **Google Labs DESIGN.md v0.1.0 alpha** comme 
source de vérité UI pour toutes les surfaces (Discord Components V2, 
landing page, dashboard, emails).

## Alternatives considérées

### Alt 1 : CSS variables pures
- Pros : standard web
- Cons : pas lisibles par IA hors contexte, pas de Do's/Don'ts 
  documentés
- **Rejeté** : un design system n'est pas que des variables

### Alt 2 : Format custom Soulbot
- Pros : flexibilité totale
- Cons : réinvention de la roue, pas d'interopérabilité
- **Rejeté** : Google Labs a déjà itéré sur ce format

## Conséquences

### Positives
- Cohérence toutes surfaces
- Compat future (autres agents IA peuvent lire)
- Tokens, fonts, Do's/Don'ts en un seul endroit
- Tuteur stage : document professionnel

### Négatives / Trade-offs
- Format encore en alpha (v0.1.0) — peut évoluer
- Dépendance à un standard externe

### Action items découlant
- [x] DESIGN.md créé avec tokens rouges
- [x] CLAUDE.md référence DESIGN.md (section Design System)
- [ ] Mise à jour DESIGN.md quand nouveaux components créés

## Liens
- [[fichier-design-md]]
- [[concept-identite-rouge-noir]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
