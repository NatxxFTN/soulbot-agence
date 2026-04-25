---
title: Pack Forteresse
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [pack, sécurité]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: medium
---

# Pack Forteresse

## Nature
Type : **pack** — système de sécurité

## Description
Pack de sécurité signature Soulbot comportant 12 protections 
anti-actions malveillantes (anti-raid, anti-link, anti-spam, etc.) 
couplées au système de permissions 3 niveaux.

## Caractéristiques
- 12 détecteurs dans `bot/core/security-detectors/` [À VALIDER NATHAN]
- Couplé au système [[permissions-3-niveaux]]
- Activation/désactivation via panel Components V2 à customId 
  `security:feature:toggle:<nom>`

## Rôle dans Soulbot
Différenciateur majeur vs bots concurrents (MEE6, Dyno, 
[[crowbot-vs-soulbot|CrowBot]]). Positionne Soulbot comme "bot premium 
avec sécurité forteresse".

## Bugs connus (au 2026-04-24)
- `;unlock` : potentiellement bugué — signalé mais pas reproduit
- Collision `;lock` / `;lockdown` : à investiguer

## Interactions / Relations
- Exécuté par [[sub-agent-secops]]
- Applique [[concept-pattern-customid]]
- Lié à [[permissions-3-niveaux]]

## État
Status : **en prod · 2 bugs backlog**

## [À VALIDER NATHAN]
- Liste exhaustive des 12 détecteurs : anti-raid, anti-link, anti-spam, 
  anti-mass-mention, anti-mass-ping... complète ?
- Structure exacte de `bot/core/security-detectors/`

## Sources
- [[source-2026-04-23-24-session-initiale]]
