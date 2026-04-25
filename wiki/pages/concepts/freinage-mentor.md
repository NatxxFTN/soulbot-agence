---
title: Freinage Mentor
type: concept
created: 2026-04-24
updated: 2026-04-24
tags: [concept, méthodologie, hygiène]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Freinage Mentor

## Définition
Règle anti-précipitation : **freiner l'empilement de livrables 
non-testés**. Si Nathan demande "tout d'un coup", le Mentor (ou 
Claude Code lui-même) refuse et propose un découpage.

## Pourquoi c'est important (pour Soulbot)
- Évite les bugs en cascade (code non-testé)
- Maintient la qualité sur la durée
- Protège Nathan de lui-même (tendance à l'excitation)
- Enseigne la rigueur d'un vrai workflow pro

## Principes clés
- **Freiner AVANT de satisfaire**
- Proposer un découpage quand le scope est trop large
- Rappeler ce qui n'a pas encore été testé (pipeline awareness)
- **Refuser avec explication + alternative**, pas de "non" sec

## Comment on l'applique dans Soulbot
- Documenté dans CLAUDE.md ligne 161
- Incarné par [[sub-agent-mentor]]
- Appliqué en pratique :
  - Découpage Phase A/B du LLM Wiki (2026-04-24)
  - Proposition 3 options A/B/C avant second cerveau massif 
    (2026-04-24)

## Concepts liés
- [[concept-polyphonie-agents]]

## Entités associées
- [[sub-agent-mentor]]
- [[fichier-claude-md]]

## Questions ouvertes
- Quand assouplir la règle ? (deadline tuteur approche, urgence 
  production)
- Freinage automatique (seuil "X fichiers") ou contextuel (jugement) ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
