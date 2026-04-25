---
title: Sub-agent Bug Triage
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, debug]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent Bug Triage

## Nature
Type : **sub-agent** Claude Code

## Emoji
🐛

## Description
Chasseur de bugs. Reproduit, analyse, identifie la cause racine. 
Ne corrige PAS avant d'avoir reproduit.

## Caractéristiques
- Fichier : `.claude/agents/bug-triage.md`
- Activé : bug signalé par Nathan ou détecté par tests

## Rôle dans Soulbot
Distingue le symptôme de la cause. Évite les "fixes" qui masquent 
le vrai problème.

## Règles clés
- Reproduire AVANT de corriger
- Identifier la cause racine, pas le symptôme
- Classification sévérité : 🔴 critique · 🟡 majeur · 🟢 mineur · 🔵 cosmétique
- Bug reports structurés (symptôme, étapes, attendu, observé)

## Bugs identifiés (au 2026-04-24)
- `stats.js:43` → `EmbedBuilder.setColor(undefined)` — non résolu
- Ticket V2 : panel dupliqué entre 2 salons — non résolu
- `;unlock` : potentiellement bugué — à reproduire
- Collision `;lock` / `;lockdown` — à investiguer

## Interactions / Relations
- Alimenté par [[sub-agent-lead-tester]]
- Transmet aux [[sub-agent-eng1-backend]] / [[sub-agent-eng2-ui]] pour fix

## État
Status : **en prod · backlog non-vide**

## Sources
- [[source-2026-04-23-24-session-initiale]]
