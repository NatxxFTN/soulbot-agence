---
title: Ticket V2
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [système, tickets]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: medium
---

# Ticket V2

## Nature
Type : **système** — tickets de support Discord

## Description
Système de tickets refait en Components V2. Permet aux membres d'un 
serveur d'ouvrir un ticket privé avec les modérateurs.

## Caractéristiques
- Framework : Components V2 (ContainerBuilder)
- Panel de gestion via customId `ticket:*`
- Transcript conservés en DB

## Rôle dans Soulbot
Feature de support standard demandée par les admins Discord. 
Différenciation vs ticket classique : UI Components V2 rouge/noir.

## Bugs connus (au 2026-04-24)
- **Panel dupliqué entre 2 salons** — chargement buggé, origine non 
  identifiée
- Autres bugs de chargement [À VALIDER NATHAN]

## Interactions / Relations
- Applique [[concept-components-v2]]
- Applique [[concept-pattern-customid]]

## État
Status : **en prod · avec bugs**

## [À VALIDER NATHAN]
- Description exacte du bug "panel dupliqué entre 2 salons"
- Reproduction documentée ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
