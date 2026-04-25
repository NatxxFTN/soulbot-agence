---
title: Architecture Logs V3 + saut version 1.0.0 → 2.0.0
type: decision
created: 2026-04-24
updated: 2026-04-24
tags: [decision, adr, logs, architecture, version, release]
sources: []
status: active
confidence: high
---

# ADR: Architecture Logs V3 + saut version 1.0.0 → 2.0.0

**Date** : 2026-04-24
**Décideurs** : Nathan (+ Claude Code)
**Status** : active

## Contexte

Le système de logs V2 (6 commandes, 16 event types, 1 seul salon de destination
par serveur, helper monolithique) ne permettait pas :
- Routing par type d'event (plusieurs salons de logs)
- Filtres (ignore bot / user / channel / role)
- Presets / thèmes / formats personnalisés
- Cache mémoire → performance
- Stats pré-calculées, search, dashboard live

Nathan a commandé une refonte ambitieuse ("les meilleurs logs Discord
francophones") en 22 commandes visant :
- Instantanéité (fire-and-forget, 0 query DB par event)
- Auto-setup (`;logssetup` crée catégorie + 8 salons)
- Personnalisation totale
- Scalabilité (27 events au lieu de 16)

## Décision

**Deux décisions couplées :**

1. **Architecture V3 en parallèle de V2** — Création d'un nouveau helper
   `bot/core/logs-v3-helper.js` avec caches mémoire et fire-and-forget, sans
   modifier `bot/core/logs-helper.js` (V2). Les 13 listeners V2 continuent
   de fonctionner. Migration progressive prévue en Vagues 2 et 3.

2. **Bot version 1.0.0 → 2.0.0** (saut `1.x.0 → 2.0.0`, codename
   release "Logs Ultimate"). Le codename "Logs V3" désigne le système,
   pas le bot.

## Alternatives considérées

### Alt 1 : Refonte inline du helper V2 (remplacement)
- **Pros** : un seul helper à maintenir, pas de duplication
- **Cons** : casserait potentiellement les 13 listeners et les 5 commandes V2
  refondues une heure avant. Test Discord impossible en isolation.
- **Rejeté** : violation du principe "modifications chirurgicales"
  ([[sub-agent-mentor]]) — trop invasif pour une Vague 1.

### Alt 2 : Tout livrer d'un coup (22 commandes en un prompt)
- **Pros** : release "big bang" propre
- **Cons** : ~2 500 lignes non testées, scope ingérable, cumul avec
  3 chantiers précédents non testés (Innovation Pack 1/3, refonte
  22 commandes, Admin Pack logs+role). Feedback Nathan explicite :
  *"tend to stack features without testing"*.
- **Rejeté** : [[freinage-mentor]] → décomposition en 3 Vagues testables.

### Alt 3 : Bump 1.0.0 → 3.0.0 directement (comme demandé initialement)
- **Pros** : marqueur visuel fort pour "Logs Ultimate"
- **Cons** : rupture semver (pas de 2.0.0 intermédiaire), réserve 3.0.0
  pour une refonte future plus large (dashboard web, i18n, musique).
- **Rejeté** : respect semver conventionnel, 3.0.0 gardée pour plus gros.

## Conséquences

### Positives
- **Rétrocompat V2 totale** — les 13 listeners, le helper V2, et les
  5 commandes V2 refondues continuent sans régression
- **Cache mémoire** chargé au boot via `bootstrapCache()` — 0 query DB
  par event émis (hors persistance async)
- **Fire-and-forget** : `channel.send().catch(() => {})` — latence Discord
  nulle, le bot n'attend jamais la réponse Discord avant de continuer
- **Ring buffer** 50 events en mémoire par guilde → base du futur
  `;logsdashboard` live
- **EventEmitter** exposé (`onLog(cb)`) → dashboard web externe possible
- **Architecture extensible** : ajouter un event type = ajouter une entrée
  dans `EVENT_TYPES` (27 actuellement, passer à 40+ trivial)
- **Semver propre** : 2.0.0 reste disponible pour des paliers futurs,
  3.0.0 réservé à une refonte encore plus large

### Négatives / Trade-offs
- **Duplication temporaire** : 2 helpers en parallèle (V2 + V3) pendant les
  Vagues 2-3
- **Listeners non migrés en Vague 1** : les events Discord passent toujours
  par V2 ; le routing par event et les filtres V3 ne sont pas encore actifs
  sur les events réels (seulement sur l'API `;logstest` quand elle sera
  portée en V3)
- **Complexité cache invalidation** : 5 caches mémoire à garder cohérents
  avec la DB (géré via invalidation explicite dans chaque setter)
- **5 nouvelles tables SQL** + 5 colonnes ajoutées à `guild_log_config` →
  schéma plus lourd, mais chaque table a un usage clair

## Implémentation livrée — Vague 1

- `bot/core/logs-v3-helper.js` (~470 lignes) — caches + API V3 complète
- `bot/ui/panels/logs-v3-panel.js` — panel central Components V2
- `bot/ui/handlers/logs-v3-handler.js` — routeur `logs:action:*` avec stubs
  Vague 2 pour `preset/theme/stats/groups/filters`
- `bot/commands/logs/logs.js` (V3 remplace V2 refondu)
- `bot/commands/logs/logssetup.js` — auto-création catégorie + 8 salons +
  routing complet des 27 events
- `bot/commands/logs/logsstatus.js` — vue compacte embed premium
- `bot/database/index.js` — 5 nouvelles tables + ALTER idempotent +
  backfill silencieux `default_channel_id = channel_id` pour guildes V2
- `bot/events/ready.js` — hook `bootstrapCache()` + register handler
- `package.json` — version 1.0.0 → 2.0.0
- `CLAUDE.md` — entrée historique Bot v2.0.0
- `docs/CHANGELOG.md` — release notes `[2.0.0] — 2026-04-24 — "Logs Ultimate"`

## Vagues futures

- **Vague 2** : 5 commandes de contrôle (`logstoggle`, `logstoggleall`,
  `logsgroup`, `logspreset`, `logsfilter`) + migration 13 listeners V2 → V3
  + 6 nouveaux listeners + hooks mod Soulbot
- **Vague 3** : 8 commandes personnalisation + consultation (`logsformat`,
  `logscolor`, `logsicon`, `logstheme`, `logsview`, `logssearch`,
  `logsstats`, `logsexport`, `logsimport`, `logsdashboard`, `logstest`,
  `logsreset`)

## Pages liées

- [[logs-v3-ultimate]] — entité décrivant le système
- [[freinage-mentor]] — pattern qui a imposé la décomposition en Vagues
- [[sub-agent-mentor]]
- [[components-v2]] — pattern UI utilisé
- [[pattern-storage-separation]] — helper vs scheduler vs panel

## Sources

- Session de livraison 2026-04-24 (prompt Nathan + exécution Claude Code)
- `.backup-rollback/logs-v2-to-v3-1777066016/` — snapshot V2 pré-refonte
