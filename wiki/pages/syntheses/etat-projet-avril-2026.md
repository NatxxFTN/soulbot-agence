---
title: État projet Soulbot — avril 2026
type: synthesis
created: 2026-04-24
updated: 2026-04-24
tags: [synthesis, snapshot, roadmap]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# État projet Soulbot — avril 2026

## TL;DR
Soulbot est un bot Discord premium en français (fork samy/orange) 
qui vient d'achever une session de documentation massive (CLAUDE.md 
v2.0, DESIGN.md, sub-agents, LLM Wiki). Le bot est en production 
avec Pack Forteresse + Ticket V2 + Embed Builder + 54+ emojis custom. 
4 packs supplémentaires sont prévus mais non testés.

## Contexte de la synthèse
Snapshot exhaustif produit le 2026-04-24 pour amorcer le second 
cerveau wiki.

## Stack technique

- **Runtime** : Node.js (CommonJS, strict mode)
- **Discord** : `discord.js` `^14.14.1` → upgrade `^14.16+` requis 
  pour Components V2 complet
- **DB** : `better-sqlite3` `^12.8.0`
- **Dashboard futur** : Express + Socket.io
- **Cache** : aucun (pas de Redis)
- **Monorepo** : non — structure plate

## Version actuelle
**v2.0** — pivot rouge validé le 2026-04-24. 
Backup v1.4 conservé dans `.backup-rollback/2026-04-24/`.

## Réalisé (en prod)
- ~132 commandes de base (fork samy/orange)
- [[pack-forteresse]] — 12 détecteurs sécurité
- [[ticket-v2]] — système tickets Components V2 (avec bugs)
- [[embed-builder-premium]] — constructeur embeds admin
- [[permissions-3-niveaux]] — BotOwner/Buyer/Owner
- [[custom-commands]] — commandes custom par serveur
- [[multi-serveur-emojis]] — 54+ emojis custom sur 2 serveurs
- [[concept-polyphonie-agents]] — 15 sub-agents dans `.claude/agents/`

## En attente de test
- [[admin-pack]] — 16 commandes (audit PHASE 0 fait)
- [[advanced-tools-pack]] — 8 systèmes avancés
- [[power-admin-pack]] — ~30 commandes power admin
- [[innovation-pack]] — 25 commandes inventives

## Infrastructure documentation livrée (2026-04-24)
- [[fichier-claude-md]] v2.0
- [[fichier-design-md]] (format Google Labs)
- [[fichier-agents-md]] (standard multi-agents)
- [[fichier-gitleaks-toml]] (+ GitHub Action CI)
- LLM Wiki Phase A (structure, templates, slash commands)
- 13 slash commands custom dans `.claude/commands/`

## Bugs connus (non résolus)
- `bot/commands/stats/stats.js:43` — `EmbedBuilder.setColor(undefined)`
- `;unlock` — potentiellement bugué
- Ticket V2 — panel dupliqué entre 2 salons
- Collision `;lock` / `;lockdown`

## Conclusions
Soulbot est en **phase 6** de son développement : infrastructure 
documentaire et méthodologique solide en place. Les 4 packs à 
venir représentent le dernier gros chantier de features avant 
consolidation.

## Actions proposées
- [ ] Installer gitleaks binaire localement
- [ ] Upgrade `discord.js` vers `^14.16.0`
- [ ] Fix `stats.js:43`
- [ ] Tester `/wiki-query` sur [[overview]]
- [ ] Déplacer `.obsidian/` à la racine (option A discutée)

## Pages liées
- [[historique-developpement]]
- [[pipeline-chantiers-en-cours]]
- [[roadmap-tuteur-stage]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
