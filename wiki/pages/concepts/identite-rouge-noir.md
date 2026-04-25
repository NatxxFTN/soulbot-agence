---
title: Identité rouge et noir
type: concept
created: 2026-04-24
updated: 2026-04-24
tags: [concept, design, brand]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Identité rouge et noir

## Définition
Identité visuelle signature Soulbot basée sur deux couleurs : 
**noir profond `#0A0A0A`** (background) et **rouge vif `#FF0000`** 
(accent). Appliquée sur toutes les surfaces (bot Discord, landing, 
dashboard, emails).

## Pourquoi c'est important (pour Soulbot)
- Différenciation vs bots concurrents (MEE6 bleu, Dyno violet, 
  CrowBot coloré)
- Signature reconnaissable dès le premier coup d'œil
- Identité brutaliste cohérente avec le ton "forteresse premium"

## Principes clés
- Background : `#0A0A0A` (pas du noir pur, légèrement réchauffé)
- Accent : `#FF0000` (rouge vif, pas bordeaux)
- Pas de gradients multi-couleurs (simplicité)
- Noir domine, rouge ponctue

## Comment on l'applique dans Soulbot
- Components V2 : `ContainerBuilder` avec accent `0xFF0000`
- Landing page : background noir, CTA et accents rouges
- Dashboard : palette cohérente (tokens DESIGN.md)
- Emails : même palette

## Concepts liés
- [[concept-components-v2]]

## Entités associées
- [[fichier-design-md]]
- [[sub-agent-designer]]
- [[sub-agent-web-designer]]

## Questions ouvertes
- Mode "light" (inverse) envisagé ?
- Accessibilité contrast ratio AA/AAA ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
- [[2026-04-24-pivot-identite-rouge]]
