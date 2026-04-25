---
title: Overview Soulbot
type: synthesis
created: 2026-04-24
updated: 2026-04-24
tags: [overview, synthesis]
status: active
confidence: high
---

# 🎯 Overview Soulbot

Soulbot est un bot Discord premium français développé par Nathan 
(stagiaire dev web). L'objectif : devenir un des bots Discord 
francophones les plus complets et stylés, utilisé comme pièce 
maîtresse du portfolio de fin de stage.

## Positionnement

- **Langue** : français
- **Identité visuelle** : noir (#0A0A0A) + rouge (#FF0000) 
  — voir [[fichier-design-md]]
- **Framework UI** : Discord Components V2 partout 
  — voir [[concept-components-v2]]
- **Différenciation** : qualité premium, design signature, sécurité forteresse

## État actuel (avril 2026)

### Réalisé
- ~132 commandes de base (fork samy/orange)
- [[pack-forteresse]] : 12 détecteurs sécurité
- [[embed-builder-premium]] : constructeur d'embeds
- [[permissions-3-niveaux]] : BotOwner/Buyer/Owner
- [[custom-commands]] : système de commandes custom
- [[multi-serveur-emojis]] : 54+ emojis custom sur 2 serveurs
- [[polyphonie-14-agents]] : squad sub-agents spécialisés
- Documentation : [[fichier-claude-md]], [[fichier-design-md]], 
  [[fichier-agents-md]] (prévu)

### En attente de test
- Admin Pack (Logs + Welcomer + Rôles)
- Advanced Tools Pack (TempVoc, Forms, Suggestions, etc.)
- Power Admin Pack
- Innovation Pack (25 commandes inventives)

### Roadmap
Voir [[synthesis-roadmap-presentation-tuteur]]

## Stack technique

- discord.js v14.16+ (Components V2)
- Node.js
- better-sqlite3 (DB)
- Express + Socket.io (dashboard futur)

## Ressources liées

- [[fichier-claude-md]] — Règles projet
- [[fichier-design-md]] — Design system
- [[sub-agent-mentor]] — Garde-fou projet
- [[decision-pivot-rouge]] — Pivot identité

## Sources
- [[source-conversation-2026-04-23-24]] — Session de dev complète
- [[source-toolbox-analysis]] — Analyse toolbox Qalisia
