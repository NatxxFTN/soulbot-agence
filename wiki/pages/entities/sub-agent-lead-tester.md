---
title: Sub-agent Lead Testeur
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [sub-agent, qa]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Sub-agent Lead Testeur

## Nature
Type : **sub-agent** Claude Code

## Emoji
🎯

## Description
Chef de la QA. Identifie les cas de test, edge cases, scénarios 
d'erreur. Priorise les tests par criticité.

## Caractéristiques
- Fichier : `.claude/agents/lead-tester.md`
- Activé : après chaque livraison de feature, avant commit majeur

## Rôle dans Soulbot
Anticipe ce qui peut casser. Pense comme un utilisateur malicieux.

## Règles clés
- 4 catégories de tests : nominal, limite, erreur, débile
- Priorité P0 (critique) / P1 (important) / P2 (nice to have)
- Edge cases systématiquement : salon supprimé, bot perd perms, 
  rate limit, user quitte

## Interactions / Relations
- Déclenche [[sub-agent-bug-triage]] si bug trouvé
- Collabore avec [[sub-agent-auditor]]

## État
Status : **en prod**

## Sources
- [[source-2026-04-23-24-session-initiale]]
