---
title: Sub-agent Architecte
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, architecture]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent Architecte

## Nature
Type : **sub-agent** Claude Code

## Emoji
🏛️

## Description
Gardien de la cohérence système. Définit et fait respecter structures, 
patterns, architecture de code.

## Caractéristiques
- Fichier : `.claude/agents/architect.md`
- Activé : toute décision structurelle, créations de modules, 
  conventions de code

## Rôle dans Soulbot
Empêche la dérive architecturale. Garant des patterns Components V2, 
de la séparation logique métier/storage, du pattern customId.

## Règles clés
- Pattern customId strict : `panel:section:action[:arg]`
- Maximum ~300 lignes par fichier (découper si plus)
- Séparation métier / storage / UI stricte
- Lire le fichier AVANT de modifier

## Interactions / Relations
- Collabore avec [[sub-agent-eng1-backend]], [[sub-agent-eng2-ui]], 
  [[sub-agent-eng8-infra]]
- Applique [[concept-pattern-customid]], 
  [[concept-pattern-storage-separation]]

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
