---
title: Embed Builder Premium
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [système, commande]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: medium
---

# Embed Builder Premium

## Nature
Type : **commande** — constructeur d'embeds Discord

## Description
Commande `;embed` permettant aux admins de construire visuellement 
des embeds Discord avec preview en temps réel, choix de couleur, 
emojis, templates préfabriqués.

## Caractéristiques
- Preview en temps réel
- Sélecteur de couleur
- Support emojis custom Soulbot via `e()`
- Templates préfabriqués

## Rôle dans Soulbot
Permet aux admins de produire des embeds propres sans connaître 
le JSON Discord. Feature de confort très demandée.

## Interactions / Relations
- Consomme [[multi-serveur-emojis]] pour les emojis custom
- Applique [[concept-components-v2]] [À VALIDER NATHAN]

## État
Status : **en prod**

## [À VALIDER NATHAN]
- L'Embed Builder utilise-t-il Components V2 ou encore des embeds 
  classiques ?
- Liste des templates préfabriqués ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
