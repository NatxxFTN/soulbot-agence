---
title: Logs V3 Ultimate
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [entity, logs, système, vague-1-livrée]
sources: []
status: active
confidence: high
---

# Logs V3 Ultimate

## Nature
Type : **système** (pack de commandes + helper + architecture cache)

## Description

Système de logs serveur Discord de nouvelle génération pour Soulbot.
Remplace la V2 (6 commandes, 16 event types, 1 salon unique) par une
architecture cache-mémoire avec routing par event, filtres, formats
personnalisés, presets, thèmes, historique persistant, stats pré-calculées
et dashboard temps réel.

Livré en 3 Vagues. **Vague 1 (fondations) active depuis 2026-04-24.**

## Caractéristiques

### Capacités
- **27 event types** (vs 16 V2) regroupés en 7 groupes :
  messages (3), members (6), roles (4), channels (3), voice (3),
  server (4), moderation (4)
- **Routing par event** — chaque type peut être envoyé dans un salon
  dédié ou vers le `default_channel_id`
- **Filtres** — `ignore_bot` / `ignore_user` / `ignore_channel` /
  `ignore_role` par event
- **Formats personnalisables** — template + couleur hex + emoji par event
  (squelette DB en place, UX en Vague 3)
- **Historique persistant** en DB pour search / stats
- **Stats journalières** pré-calculées (`guild_log_stats_daily`)
- **Ring buffer mémoire** — 50 derniers events par guilde
- **EventEmitter** exposé (`onLog(cb)`) pour dashboard externe

### Performance
- `bootstrapCache()` au démarrage : charge configs + routing + formats +
  filters + toggles en mémoire
- **0 query DB** en lecture par event émis (cache-first)
- **Fire-and-forget** : `channel.send().catch(() => {})` ne bloque pas
- Persistance history + stats via `setImmediate()` (async non-bloquant)

### Rétrocompat V2
- `bot/core/logs-helper.js` (V2) intact — 13 listeners continuent
- Commandes V2 refondues (logsset, logstoggle, logstest, logsview,
  logsreset) restent fonctionnelles
- Backfill silencieux `default_channel_id = channel_id` pour guildes V2

## Rôle dans Soulbot

Pilier de la **visibilité mod** et de l'**audit trail** serveur. Couvre :
1. **Sécurité** — ban / unban / raid detection / perms change
2. **Modération** — mute / timeout / warn / kick
3. **Gestion** — rôles / salons / structure serveur
4. **Engagement** — messages / voice / boosts
5. **Monitoring** — stats quotidiennes + ring buffer temps réel

Cas d'usage showcase : `;logssetup` crée en une seule commande la
catégorie complète "📋 Logs Soulbot" + 8 salons + routing + permissions
— démonstration tangible de l'écart avec Dyno/Carl-bot/MEE6.

## Fichiers

### Vague 1 (livrée)
- `bot/core/logs-v3-helper.js` — helper principal (caches, fire-and-forget)
- `bot/ui/panels/logs-v3-panel.js` — panel Components V2 central
- `bot/ui/handlers/logs-v3-handler.js` — routeur `logs:action:*`
- `bot/commands/logs/logs.js` — panel `;logs` (V3)
- `bot/commands/logs/logssetup.js` — auto-setup magique
- `bot/commands/logs/logsstatus.js` — vue compacte
- `bot/database/index.js` — 5 tables + 5 colonnes ajoutées

### Tables SQL V3
- `guild_log_routing` — routing par event
- `guild_log_formats` — templates + couleur + icon
- `guild_log_filters` — ignore_user / bot / channel / role
- `guild_log_history` — archive persistante
- `guild_log_stats_daily` — stats agrégées

### Colonnes ajoutées à `guild_log_config`
`default_channel_id`, `theme`, `global_enabled`, `category_id`, `version`

## Commandes (22 prévues)

### Vague 1 ✅ LIVRÉE (3)
- `;logs` — panel central V3
- `;logssetup` — auto-create catégorie + 8 salons + routing
- `;logsstatus` — vue compacte

### Vague 2 (5)
`;logstoggle`, `;logstoggleall`, `;logsgroup`, `;logspreset`, `;logsfilter`
+ migration 13 listeners V2 → V3 + 6 nouveaux listeners + hooks mod

### Vague 3 (14)
`;logsset`, `;logsreset`, `;logstest`, `;logsformat`, `;logscolor`,
`;logsicon`, `;logstheme`, `;logsview`, `;logssearch`, `;logsstats`,
`;logsexport`, `;logsimport`, `;logsdashboard`, `;logsmigrate`

## Interactions / Relations

- Livré en parallèle de [[admin-pack]] (logs groupe initial)
- S'appuie sur [[components-v2]] pour tous les panels
- Utilise [[pattern-storage-separation]] : helper ≠ panel ≠ handler ≠ command
- Dépend de [[permissions-3-niveaux]] : `ManageGuild` + `ManageChannels`
  pour setup
- Utilisé par [[fichier-claude-md]] : section logs dans les conventions
  de code
- Atome `cat_innovation` (uploadé 2026-04-24) apparaît dans le header
  du panel `;logs`

## État

Status : **Vague 1 actif · Vagues 2 & 3 planifiées**

## Tests Discord validés

_(à remplir par Nathan après ses tests)_

- [ ] `;logs` — panel V3 spectaculaire
- [ ] `;logsstatus` — vue compacte
- [ ] `;logssetup` — création catégorie + 8 salons
- [ ] Bouton "Désactiver" dans `;logs`
- [ ] Bouton "Export" → JSON

## Sources

- [[2026-04-24-logs-v3-architecture]] — ADR de livraison
- Session de livraison 2026-04-24
- Backup V2 : `.backup-rollback/logs-v2-to-v3-1777066016/`
