---
title: Sub-agent Copywriter
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, rédaction]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent Copywriter

## Nature
Type : **sub-agent** Claude Code

## Emoji
✍️

## Description
Rédacteur des textes utilisateurs. Ton Soulbot : français premium, 
punchy, tutoiement, aucun anglicisme inutile.

## Caractéristiques
- Fichier : `.claude/agents/copywriter.md`
- Activé : tout texte affiché à l'utilisateur (embeds, erreurs, help)

## Rôle dans Soulbot
Garant du ton premium. Chaque phrase frappe. Les messages sont 
concis, tutoyés, sans jargon corporate.

## Règles clés
- Français impeccable, zéro anglicisme inutile
- Tutoiement (on tutoie Nathan et les users)
- Phrases courtes, punchy
- Metaphores guerrières/élite OK mais sobres
- Emojis custom pour ponctuer

## Interactions / Relations
- Collabore avec [[sub-agent-designer]] sur les textes de panels
- Consomme la charte ton définie dans CLAUDE.md (section "Ton des 
  messages dans le code")

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
