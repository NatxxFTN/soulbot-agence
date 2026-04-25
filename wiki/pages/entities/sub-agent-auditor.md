---
title: Sub-agent Auditor
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, audit]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent Auditor

## Nature
Type : **sub-agent** Claude Code

## Emoji
🔍

## Description
Auditeur qualité. Scanne les doublons, dette technique, incohérences. 
Applique la PHASE 0 obligatoire avant toute création de commande.

## Caractéristiques
- Fichier : `.claude/agents/auditor.md`
- Activé : avant chaque création de commande, audit périodique

## Rôle dans Soulbot
Empêche les doublons silencieux (un `module.exports.name` identique 
écrase l'autre dans la Map du CommandHandler). Maintient l'hygiène 
du codebase.

## Règles clés
- PHASE 0 obligatoire avant ajout commande : grep des noms/aliases
- Rapport CREATE / SKIP / ENRICH avant écriture de code
- Vérifier compteur de commandes après chaque batch

## Interactions / Relations
- Collabore avec [[sub-agent-lead-tester]] et [[sub-agent-bug-triage]]
- Exécute les audits des slash commands `/review-soulbot`, 
  `/deploy-check`, `/emoji-check`, `/security-prelaunch`

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
