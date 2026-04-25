---
title: Sub-agent ENG2 UI
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, ui]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent ENG2 UI

## Nature
Type : **sub-agent** Claude Code

## Emoji
🖥️

## Description
Responsable des interactions Discord : handlers de boutons, modals, 
selectMenus, collectors. Routage des customId vers la bonne action.

## Caractéristiques
- Fichier : `.claude/agents/eng2-ui.md`
- Activé : création/modif de handlers UI et interactions

## Rôle dans Soulbot
Fait le pont entre clic utilisateur et logique métier. Chaque bouton 
Discord déclenche une action définie par ENG2.

## Règles clés
- Pattern customId strict : `panel:section:action[:arg]`
- `interaction.deferReply()` si traitement > 3s
- Timeout sur tous les collectors
- Filter `interaction.user.id` sur collectors utilisateur

## Interactions / Relations
- Consomme les logics de [[sub-agent-eng1-backend]]
- Applique [[concept-pattern-customid]], [[concept-components-v2]]

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
