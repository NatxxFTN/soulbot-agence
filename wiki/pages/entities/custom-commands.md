---
title: Custom Commands
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [système, commandes]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: medium
---

# Custom Commands

## Nature
Type : **système** — commandes définies par les admins de serveur

## Description
Système permettant aux Owners de serveur de créer leurs propres 
commandes customisées avec des variables dynamiques (ex: `{user}`, 
`{server}`, etc.).

## Caractéristiques
- Storage : `bot/core/custom-commands-storage.js` [À VALIDER NATHAN]
- Variables supportées : définies dans `bot/core/custom-variables.js` 
  [À VALIDER NATHAN]
- Création via commande ou panel

## Rôle dans Soulbot
Permet à chaque serveur d'adapter Soulbot à sa culture. Feature de 
personnalisation clé.

## Interactions / Relations
- Utilise [[concept-pattern-storage-separation]]
- Géré par [[sub-agent-eng1-backend]]

## État
Status : **en prod**

## [À VALIDER NATHAN]
- Noms exacts des fichiers storage/variables
- Liste des variables supportées

## Sources
- [[source-2026-04-23-24-session-initiale]]
