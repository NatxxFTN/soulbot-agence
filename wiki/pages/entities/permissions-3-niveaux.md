---
title: Permissions 3 niveaux
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [système, permissions]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Permissions 3 niveaux

## Nature
Type : **système** — contrôle d'accès

## Description
Système d'autorisation à 3 niveaux permettant de contrôler qui peut 
utiliser quelles commandes sur quel serveur.

## Caractéristiques

### Niveau 1 — BotOwner
- Défini dans `.env` (`BOT_OWNER_IDS`)
- Accès total à toutes les commandes
- Peut ajouter des Buyers

### Niveau 2 — Buyer
- Ajouté par un BotOwner
- Stocké en DB
- Peut ajouter des Owners

### Niveau 3 — Owner
- Ajouté par un Buyer
- Stocké en DB
- Utilise le bot sur son serveur

### Whitelist totale
- Users non-listés refusés par défaut
- Exceptions : `;help` et `;ping` (publics)

## Rôle dans Soulbot
Base du modèle premium : le bot n'est utilisable que par ceux qui 
ont été autorisés (Owner). Mécanisme de monétisation future potentiel.

## Interactions / Relations
- Middleware dans le CommandHandler
- Couplé à [[pack-forteresse]]
- Enforce par [[sub-agent-secops]]

## État
Status : **en prod · source de vérité permissions**

## Sources
- [[source-2026-04-23-24-session-initiale]]
