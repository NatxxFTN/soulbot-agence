# Changelog Soulbot

Toutes les modifications notables du bot sont documentées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Unreleased]

## [2.0.0] — 2026-04-24 — "Logs Ultimate"

**Saut majeur de version 1.0.0 → 2.0.0.** Justification (ADR) : arrivée de
l'architecture Logs V3, première refonte qui introduit des changements de
schéma SQL (5 nouvelles tables) et un helper parallèle avec rétrocompat V2 —
incompatible avec le pipeline de logs pré-refonte au-delà de la simple
mise à jour. On saute 2.0.0 plutôt que 1.x.0 pour refléter le palier
d'architecture. Le codename du système reste **Logs V3** (feature version),
le bot passe **Soulbot v2.0.0**.

### Added — Logs V3 Ultimate (Vague 1 sur 3)
Fondations du système de logs le plus avancé du francophone Discord.

- **Helper `bot/core/logs-v3-helper.js`** (~470 lignes) — caches mémoire
  (config / routing / formats / filters / toggles), ring buffer 50 events
  par guilde, fire-and-forget sur `channel.send()`, persistance async
  via `setImmediate`, `EventEmitter` pour dashboard temps réel
- **27 event types** (vs 16 en V2) regroupés en 7 catégories : messages
  (3), members (6), roles (4), channels (3), voice (3), server (4),
  moderation (4)
- **5 nouvelles tables SQL** : `guild_log_routing`, `guild_log_formats`,
  `guild_log_filters`, `guild_log_history`, `guild_log_stats_daily`
- **Migration V2 → V3 silencieuse** au démarrage : ALTER TABLE
  `guild_log_config` + backfill `default_channel_id = channel_id`
- **Panel V3 `;logs`** — `ContainerBuilder` Components V2 avec emoji
  custom atome **`cat_innovation`**, status system, activité 24h avec
  barre de progression, groupes d'events avec dots remplis ●○,
  8 boutons d'action
- **Commande `;logssetup`** — LA commande magique : crée catégorie
  "📋 Logs Soulbot" + 8 salons (all-logs, message-logs, member-logs,
  role-logs, channel-logs, voice-logs, server-logs, mod-logs) avec
  permissions auto (@everyone sans vue, bot send+embed, rôles admin
  auto-accès) + routing complet des 27 events en une seule action
- **Commande `;logsstatus`** — vue compacte embed premium
- **Handler `bot/ui/handlers/logs-v3-handler.js`** — routage
  `logs:action:*` avec stubs "Coming soon" pour Vague 2 (preset, theme,
  stats, groups, filters)
- **Bootstrap cache** appelé dans `ready.js` : toutes les configs
  chargées en mémoire une fois — **0 query DB par event émis**

### Changed
- Emoji atome custom **`cat_innovation`** uploadé sur serveur
  `S👍👍👍` (ID `1497346591940542639`) — mapping automatique dans
  `data/emojis-ids.json`, fallback Unicode ⚛️ conservé
- Bot version 1.0.0 → **2.0.0**

### Kept (V2 rétrocompat)
- `logs-helper.js` (V2) intact — les 13 listeners `bot/events/logs-*.js`
  continuent d'utiliser l'API V2 sans régression
- Commandes V2 refondues visuellement (logsset, logstoggle, logsreset,
  logstest, logsview) restent fonctionnelles
- `;logs` (ex-V2 refondu V2) est remplacé par le panel V3

### À venir (Vague 2 / 3)
- Vague 2 : `;logstoggle`, `;logstoggleall`, `;logsgroup`, `;logspreset`,
  `;logsfilter`, hooks mod Soulbot, 6 listeners supplémentaires
  (bulkDelete, channelUpdate, guildUpdate, emojiUpdate, guildBoost,
  inviteCreate)
- Vague 3 : `;logsformat`, `;logscolor`, `;logsicon`, `;logstheme`,
  `;logsview`, `;logssearch`, `;logsstats`, `;logsexport`, `;logsimport`,
  `;logsdashboard` (live), `;logstest`, `;logsreset`

## [Unreleased précédent]

### Changed — Refonte visuelle premium des 22 dernières commandes
Alignement Innovation 1/3 + Admin Rôles + Admin Logs sur le standard premium Soulbot.

- **Helper partagé** `bot/ui/panels/_premium-helpers.js` — factories V2 / embeds / scoring / footer signature
- **Type A (panels V2 riches)** : auditserver, channelpermcheck, rolelist, roleinfo, logs, logsview, dryrun
  — ContainerBuilder accent `0xFF0000`, hero score, separators, sections thématiques
- **Type B (embeds premium)** : createrole, editrole, logsset, logstoggle, logstest, nickrestore, rolesync, schedule (create feedback)
  — Accent rouge uniforme, fields structurés, footer `Soulbot • <Category> • <user>`
- **Type C (confirmations V2)** : deleterole, logsreset, purgeemojis, freeze-result, unfreeze-result
  — `ContainerBuilder` avec warning + preview + boutons Danger/Secondary
- **Type D (batch preview V2)** : channeltemplate (liste + résultat), exportdata (résumé + attachement), schedule list (panel)
- **Type E (simulation V2)** : dryrun — panel SIMULATION avec vérifications ✅/❌
- **Showcase auditserver** : 6 sections thématiques (🛡️ Sécurité · 📜 Rôles · 📂 Salons · 👥 Membres · 🎨 Emojis · 🔗 Intégrations), hero score avec barre de progression, top 3 recommandations, boutons *Re-auditer* + *Export JSON*
- **Handler étendu** : `innovation:audit:refresh` et `innovation:audit:export` (button handlers)
- **Fix V2/legacy** : `statusV2Panel()` remplace les `toEmbedReply()` sur les `interaction.update()` qui provoquaient `MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2`

### Added — Innovation Pack 1/3 (11 commandes)
Pack de gestion et power tools. Dossier `bot/commands/innovation/`.

- `;schedule` — programme une action (ban, kick, unban, role_add/remove, message) pour plus tard
  (sous-commandes : `list`, `cancel <id>`)
- `;channeltemplate` — crée une structure de salons depuis 7 templates
  (gaming, esport, community, rp, staff, ticket, giveaway)
- `;auditserver` — rapport d'audit complet (config, rôles, salons, membres, emojis, sécurité) avec score par section
- `;freeze` — mode panic, retire `SendMessages` à `@everyone` sur tous les salons texte (auto-dégel optionnel)
- `;unfreeze` — restaure les permissions depuis le snapshot
- `;purgeemojis` — scan des emojis custom inutilisés + suppression avec safeguards (`keep_`, `perm_`, `cat_`, `ani_`, `btn_`, `ui_`)
- `;nickrestore` — restaure le pseudo précédent (historique des 10 derniers)
- `;rolesync` — synchronise les rôles entre 2 membres, ou entre 2 serveurs par nom de rôle
- `;dryrun` — simule une commande (perms, hiérarchie, impact, réversibilité) sans l'exécuter
- `;channelpermcheck` — grille des permissions effectives d'un user/rôle sur un salon
- `;exportdata` — export JSON du serveur (membres, rôles, salons, config Soulbot)

### Infrastructure
- Storage : `schedule-storage`, `freeze-storage`, `nickname-history-storage`
- Helpers : `channel-templates` (7 templates hardcodés), `audit-helper`
- Schedulers : `schedule-scheduler` (tick 30s), `freeze-scheduler` (tick 60s, auto-unfreeze)
- Panels Components V2 : `schedule-panel`, `audit-panel`
- Handler : `innovation-handler` (routage `innovation:*`)
- Listener : `guildMemberUpdate` enrichi — log les changements de pseudo dans `nicknames_history`

### SQL
Nouvelles tables :
- `schedules` — actions programmées
- `freezes` + `freeze_snapshots` — état de gel + snapshot des perms
- `nicknames_history` — historique 10 derniers pseudos par membre
