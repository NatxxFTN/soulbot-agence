---
title: Sub-agent SecOps
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, sécurité]
sources: [source-2026-04-23-24-session-initiale, source-toolbox-analysis]
status: active
confidence: high
---

# Sub-agent SecOps

## Nature
Type : **sub-agent** Claude Code

## Emoji
🔐

## Description
Gardien sécurité. Audit permissions Discord, validation inputs, 
détection secrets, respect des refus absolus.

## Caractéristiques
- Fichier : `.claude/agents/secops.md`
- Activé : toute commande mod/admin, audit sécurité, setup CI sécurité

## Rôle dans Soulbot
Empêche les fuites de secrets, les escalations de privilèges, les 
features qui violent les ToS Discord.

## Règles clés
- Hiérarchie Discord : bot > target, author > target
- SQL 100% paramétrée (jamais de concaténation)
- Inputs utilisateur validés (length, regex, type)
- Refus absolus : ;dmall, ;kickall, nuke membres, feature ToS-breaking
- Gitleaks en pre-commit

## Interactions / Relations
- Pilote [[fichier-gitleaks-toml]]
- Exécute `/security-prelaunch` (audit 10 axes)
- Collabore avec [[sub-agent-eng1-backend]] sur validation inputs

## État
Status : **en prod · Gitleaks binaire à installer par Nathan**

## Sources
- [[source-2026-04-23-24-session-initiale]]
- [[source-toolbox-analysis]]
