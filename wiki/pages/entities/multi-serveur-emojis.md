---
title: Multi-serveur emojis
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [système, design]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: medium
---

# Multi-serveur emojis

## Nature
Type : **système** — gestion emojis custom multi-serveurs

## Description
Système qui distribue ~54 emojis custom Soulbot sur **2 serveurs 
Discord** pour contourner la limite de 50 emojis par serveur.

## Caractéristiques
- **~54 emojis** répartis sur 2 serveurs :
  - EMOJI_GUILD_ID (serveur principal)
  - EMOJI_GUILD_ID_2 = 1063235055356493887
- Répartition [À VALIDER NATHAN] :
  - 12 catégories
  - 14 boutons
  - 23 UI
  - 5 animés
- Helper : `bot/core/emojis.js`
- Fonctions : `e('nom')` (emoji par nom) et `forButton()` (variante bouton)
- Fallback Unicode automatique si emoji manquant

## Rôle dans Soulbot
Cohérence visuelle signature. Chaque panel, chaque bouton utilise 
les emojis custom, pas les emojis Unicode génériques.

## Storage
- Config : `data/emojis-ids.json` (format `{ name: { id, animated, 
  guildId } }`)
- Généré par `;setupemojis` ou `npm run emojis:upload`

## Interactions / Relations
- Consommé par [[sub-agent-designer]] et [[concept-components-v2]]
- Lié à [[fichier-design-md]]

## État
Status : **en prod**

## [À VALIDER NATHAN]
- Comptage exact 12/14/23/5 = 54 ? 
- Ou la répartition réelle ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
