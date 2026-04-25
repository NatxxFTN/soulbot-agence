---
title: CLAUDE.md (v2.0)
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [fichier, config, règles]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# CLAUDE.md (v2.0)

## Nature
Type : **fichier** — config principale Claude Code pour Soulbot

## Description
Fichier racine chargé automatiquement par Claude Code à chaque session. 
Contient les règles du projet, l'identité visuelle, la squad 14 agents, 
les règles anti-doublons et les refus absolus.

## Caractéristiques
- Version : v2.0 (pivotée depuis v1.4 le 2026-04-24)
- Emplacement : racine du projet
- Format : Markdown avec sections `##`
- Longueur actuelle : ~290 lignes

## Rôle dans Soulbot
Source de vérité globale pour Claude Code. Tout comportement Claude 
doit respecter ce fichier. Règles absolues et bannissements définis ici.

## Évolution
- **v1.4** (Bootstrap) — Agence Soulbot, orange #F39C12, 45 agents, 
  embeds classiques
- **v2.0** (2026-04-24) — fork samy/orange, rouge #FF0000 + noir 
  #0A0A0A, 14 agents, Components V2

Backup v1.4 conservé dans `.backup-rollback/2026-04-24/CLAUDE.md.old`.

## Sections clés
- Identité visuelle (non négociable)
- Squad polyphonique 14 agents
- Règles absolues (modifications chirurgicales, anti-doublons, 
  Components V2, permissions 3 niveaux)
- Refus absolus (;dmall, ;kickall, ToS Discord)
- Format de rapport obligatoire
- Comportement défensif (ligne 161)
- Sub-agents spécialisés
- LLM Wiki
- Toolbox Essentials intégrés

## Interactions / Relations
- Référencé par [[fichier-design-md]] pour tokens visuels
- Référence [[fichier-agents-md]]
- Implémenté par les 15 sub-agents [[sub-agent-mentor]] etc.
- Motivé par [[2026-04-24-pivot-identite-rouge]]
- Freinage détaillé dans [[freinage-mentor]]

## État
Status : **en prod · source de vérité**

## Sources
- [[source-2026-04-23-24-session-initiale]]
