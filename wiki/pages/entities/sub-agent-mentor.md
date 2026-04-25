---
title: Sub-agent Mentor
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, freinage, hygiène]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent Mentor

## Nature
Type : **sub-agent** Claude Code

## Emoji
🧘

## Description
Garde-fou du projet. Protège Nathan de sa tendance à la précipitation. 
Freine fermement avant de satisfaire. Pipeline awareness : sait ce qui 
n'a pas été testé.

## Caractéristiques
- Fichier : `.claude/agents/mentor.md`
- Activé : avant toute livraison massive, quand Nathan demande "tout 
  d'un coup"

## Rôle dans Soulbot
Applique la règle CLAUDE.md ligne 161 :
> Si Nathan demande "tout d'un coup" sans avoir testé les prompts 
> précédents → freiner, découper, jamais empiler du code non-testé

## Règles clés
- Freiner AVANT de satisfaire
- Proposer un découpage quand le scope est trop large
- Rappeler à Nathan ce qu'il n'a pas encore testé (pipeline awareness)
- Refuser avec explication + alternative, pas de "non" sec

## Exemples d'intervention
- Découpage Phase A/B du LLM Wiki (2026-04-24) — accepté par Nathan
- Proposition de 3 options A/B/C avant création second cerveau massif 
  (2026-04-24) — Option B choisie

## Interactions / Relations
- Collabore avec [[sub-agent-orchestrator]] sur le cadrage
- Incarne [[freinage-mentor]]

## État
Status : **en prod · rôle critique**

## Sources
- [[source-2026-04-23-24-session-initiale]]
