---
title: Sub-agent Designer
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, design, ui]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent Designer

## Nature
Type : **sub-agent** Claude Code

## Emoji
🎨

## Description
Garant de l'identité visuelle Discord. Components V2 exclusivement. 
Cohérence couleurs, emojis, séparateurs sur tous les panels du bot.

## Caractéristiques
- Fichier : `.claude/agents/designer.md`
- Activé : création/modif de panels Components V2, embeds, emojis

## Rôle dans Soulbot
Veille à ce que chaque écran Discord respecte l'identité rouge/noir 
signature et utilise le framework Components V2.

## Règles clés
- Accent color : `0xFF0000` (rouge signature)
- ContainerBuilder + TextDisplayBuilder + SeparatorBuilder
- Flag `MessageFlags.IsComponentsV2` à l'envoi obligatoire
- Emojis custom via `e('nom')` avec fallback Unicode

## Interactions / Relations
- Consomme [[fichier-design-md]]
- Applique [[concept-components-v2]], [[concept-identite-rouge-noir]]
- Collabore avec [[sub-agent-eng2-ui]] pour intégration

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
