---
title: 3-Packs Premium — Mapping de noms SQL adopté
type: decision
created: 2026-04-29
updated: 2026-04-29
tags: [decision, architecture, sql, 3-packs, anti-doublons]
sources: [repo-audit-2026-04-29]
status: active
confidence: high
---

# 2026-04-29 — Mapping de noms SQL pour les 3 packs

## Contexte

Les **3 packs Premium** (Power Admin · Engagement · Utility Pro,
30 commandes au total) ont été ébauchés le **2026-04-28** dans le
working tree (fichiers untracked) avant qu'un prompt de setup
infrastructure ne soit reformulé le **2026-04-29**.

Le prompt « PROMPT 1/5 — SETUP INFRASTRUCTURE 3 PACKS » spécifie
13 tables SQL nommées **`guild_*`** (préfixe canonique). Or les
30 commandes existantes utilisent des noms historiques
**sans le préfixe** (à 10 exceptions près sur 13).

## Décision

**On adopte les noms SQL existants** (Option A). Aucune migration de
schéma n'est exécutée. Les 30 commandes restent fonctionnelles
telles qu'écrites le 28 avril.

## Mapping concept → nom SQL réel

| Concept | Demandé par PROMPT 1/5 | Nom SQL réel adopté | Match |
|---|---|---|---|
| Antiraid config | `guild_antiraid_config` | `raidmode_config` (existant) + colonnes ajoutées (`detection_window_sec`, `detection_threshold`, `lockdown_on_raid`) + `antiraid_recent_joins` | ❌ |
| Lockdowns timés | `guild_lockdowns` | `lockdown_timed` | ❌ |
| Polls | `guild_polls` + `guild_poll_votes` | `polls` + `poll_votes` (tables historiques) | ❌ |
| Giveaways | `guild_giveaways` + `guild_giveaway_entries` | `giveaways` + `giveaway_participants` (tables historiques) | ❌ |
| Suggestions v2 | `guild_suggestions` + `guild_suggestion_votes` | `suggestionv2` + `suggestionv2_votes` | ❌ |
| Welcome | `guild_welcome_config` | `welcome_config` (existant, schéma riche) | ❌ |
| Goodbye | `guild_goodbye_config` | `greeting_config` (champs `leave_*` existants) | ❌ |
| Reaction roles | `guild_reaction_roles` | `guild_reaction_roles` | ✅ |
| Autoroles | `guild_autoroles` | `guild_autoroles` | ✅ |
| XP | `guild_xp` (col `last_message_at`) | `guild_xp` (col `last_msg`) | ⚠️ partiel |

## Pourquoi Option A

1. **Anti-doublons (CLAUDE.md, règle absolue)** — créer 10 tables
   parallèles aux 10 tables existantes produit du schéma fantôme :
   les commandes continuent d'écrire dans les anciens noms, les
   nouveaux restent vides.
2. **Code testé** — les 30 commandes passent leur boot sans erreur
   (`power-admin: 10/10 ✅`, `engagement: 10/10 ✅`,
   `utility-pro: 10/10 ✅`).
3. **Coût/risque** — l'alternative (renommer 10 tables + réécrire
   30 commandes + handlers + schedulers) coûte ~2-3 h pour 0 gain
   fonctionnel et un risque élevé de régression.

## Conséquences

- **Helpers infra créés malgré tout** :
  - [[bot/core/api-helper.js]] — fetch + cache LRU 100 + rate-limit
    30/min/host + timeout AbortController. Utilise `fetch` global
    (Node ≥ 18). Pas de dépendance `node-fetch`.
  - [[bot/core/duration-parser.js]] — grammaire stricte
    `<entier><smhdw>` + `formatDuration` en français.
- **Aucune commande n'utilise encore ces helpers** : ils sont là
  pour les évolutions futures et pour servir de référence
  (la lib `ms` reste utilisée par `lockdown.js` et `giveaway.js`).
- **Aucune dépendance npm ajoutée** : `node-fetch` était demandé
  par le prompt mais inutile (Node 24 fournit `fetch` global).

## Alternatives rejetées

- **Option B — re-aligner sur le préfixe `guild_*`** : implique
  ALTER + INSERT SELECT + DROP sur 10 tables, plus le rewrite des
  30 commandes. Coût élevé, gain cosmétique.
- **Option C — reset des fichiers untracked et repartir blanc** :
  perte de l'investissement du 28 avril, replanification de
  3 prompts (2/5, 3/5, 4/5) selon la spec stricte. Le code à
  produire serait ~équivalent fonctionnellement.

## Refactoring futur (si jamais)

Si un jour le préfixe `guild_*` devient une priorité (ex: pour
clarifier `polls` vs un éventuel `polls_globaux`), procéder par
migration progressive :

1. `CREATE TABLE guild_polls (...)`
2. `INSERT INTO guild_polls SELECT ... FROM polls`
3. Dual-write côté code pendant N déploiements
4. Switch des `prepare()` vers `guild_polls`
5. `DROP TABLE polls` après vérification

## Sources

- Audit `git status` du 2026-04-29
- Lecture de `bot/database/index.js` (lignes 589-673, schéma 3-packs)
- Lecture de `bot/core/3packs-handlers.js` et `3packs-schedulers.js`
- Inspection des 30 commandes dans `bot/commands/{power-admin,engagement,utility-pro}/`
