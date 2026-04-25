---
title: Pipeline des chantiers en cours
type: synthesis
created: 2026-04-24
updated: 2026-04-24
tags: [synthesis, pipeline, roadmap]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: medium
---

# Pipeline des chantiers en cours

## TL;DR
Au 2026-04-24, Nathan a plusieurs chantiers en parallèle à divers 
stades : prompts prêts non-collés, packs non-testés, bugs en backlog. 
Cette page les liste pour éviter de les perdre.

## Contexte de la synthèse
Nathan a tendance à empiler les chantiers. Cette page sert de 
check-list pour garder la vue d'ensemble.

## Analyse

### Prompts prêts non-collés [À VALIDER NATHAN]
- [[admin-pack]] (PHASE 0 audit fait, en attente validation)
- [[advanced-tools-pack]] (spec prête)
- [[power-admin-pack]] (spec prête)
- [[innovation-pack]] sous-packs 1/3, 2/3, 3/3 (specs prêtes)

### Tests en attente
- Pack Forteresse complet — test end-to-end manuel
- Ticket V2 — reproduction des bugs
- `/wiki-query` sur [[overview]]
- `/wiki-save` (jamais testé)
- `/security-prelaunch` (jamais testé)
- `/deploy-check` (jamais testé)

### Bugs en backlog
- 🔴 `stats.js:43` — `setColor(undefined)`
- 🟡 `;unlock` bugué
- 🟡 Ticket V2 panel dupliqué
- 🟢 Collision `;lock` / `;lockdown`

### Chantiers techniques pending
- Upgrade `discord.js` `^14.14.1` → `^14.16+`
- Installer gitleaks binaire
- Phase B LLM Wiki (ingestions initiales via `/wiki-ingest`)
- Déplacer `.obsidian/` à la racine (option A/B/C discutée)

## Conclusions
Le backlog est riche. Priorité recommandée :
1. Fix `stats.js:43` (bloque les logs)
2. Tester les slash commands créés (LLM Wiki, security)
3. Valider un pack de commandes (Admin d'abord)

## Actions proposées
- [ ] Revue hebdomadaire de ce pipeline (via `/wiki-query`)
- [ ] Décision Admin Pack : GO ou défer ?
- [x] Installation gitleaks

## Pages liées
- [[etat-projet-avril-2026]]
- [[roadmap-tuteur-stage]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
