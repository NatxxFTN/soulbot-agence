---
title: DESIGN.md (format Google Labs v0.1.0 alpha)
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [fichier, design, standards]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# DESIGN.md (format Google Labs v0.1.0 alpha)

## Nature
Type : **fichier** — design system complet

## Description
Source de vérité pour toutes les surfaces visuelles du projet 
(Discord Components V2, landing page, dashboard, emails). Format 
Google Labs DESIGN.md spec v0.1.0 alpha.

## Caractéristiques
- Tokens : colors, typography, spacing, components
- Fonts : Instrument Serif (headlines), Inter (UI), JetBrains Mono (code)
- Identité visuelle : #0A0A0A (background) + #FF0000 (accent)
- Do's and Don'ts explicites

## Rôle dans Soulbot
Tout agent qui crée une UI (bot Discord, dashboard, emails, landing) 
doit lire DESIGN.md AVANT de produire du code ou du contenu visuel.

## Interactions / Relations
- Référencé par [[fichier-claude-md]] (section Design System)
- Applique [[concept-identite-rouge-noir]]
- Consommé par [[sub-agent-designer]] et [[sub-agent-web-designer]]
- Motivé par [[2026-04-24-adoption-design-md]]

## État
Status : **en prod · source de vérité UI**

## Sources
- [[source-2026-04-23-24-session-initiale]]
