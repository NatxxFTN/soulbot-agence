# 📜 Log du Wiki Soulbot

Journal chronologique des opérations sur le wiki.
Format : `## [YYYY-MM-DD] TYPE | Titre`

Types : ingest | query | lint | maintenance | create | update

---

## [2026-04-24] maintenance | Initialisation du wiki

- Création de la structure wiki/
- Création de SCHEMA.md (règles et conventions)
- Création de index.md (catalogue)
- Création de overview.md (vue synthèse Soulbot)
- Création de 5 templates dans templates/
- Setup compatibilité Obsidian (déjà configurée via .obsidian/)

## [2026-04-24] amorce-massive | Création second cerveau Soulbot

Option B assumée par Nathan (full send avec marquage draft/low 
confidence sur extrapolations).

- **Pages créées : 52**
  - entities : 29 (4 fichiers config + 15 sub-agents + 6 systèmes + 
    4 packs prévus)
  - decisions : 7 ADR
  - concepts : 7
  - syntheses : 5
  - comparisons : 3
  - raw/conversations : 1 transcript
- **Nouvelle slash command** : /wiki-ingest-conversation
- **Updates** : CLAUDE.md (section LLM Wiki enrichie), 
  wiki/index.md (catalogue complet), wiki/log.md (cette entrée)
- **Backups pré-modif** : `.backup-rollback/2026-04-24/` 
  (CLAUDE.md.pre-brain, wiki-index.md.pre-brain, 
  wiki-log.md.pre-brain)

Marquage : sections `[À VALIDER NATHAN]` partout où extrapolation. 
Pages `status: draft` + `confidence: low` sur les 4 packs prévus et 
quelques entités floues. À relire dans 48h.

## [2026-04-24] added | Innovation Pack 1/3 — 11 commandes

Livraison Sous-pack 1/3 (Gestion & Power Tools) :

- **11 commandes créées** dans `bot/commands/innovation/` :
  schedule, channeltemplate, auditserver, freeze, unfreeze,
  purgeemojis, nickrestore, rolesync, dryrun, channelpermcheck,
  exportdata
- **Storage** : schedule-storage, freeze-storage,
  nickname-history-storage (3 nouvelles tables SQL)
- **Helpers** : channel-templates (7 templates hardcodés),
  audit-helper (6 sections d'audit)
- **Schedulers** : schedule-scheduler (tick 30s),
  freeze-scheduler (tick 60s, auto-unfreeze)
- **Panels Components V2** : schedule-panel, audit-panel
- **Handler** : innovation-handler (customId `innovation:*`)
- **Hook event** : guildMemberUpdate enrichi (nickname history)
- **Mise à jour** : wiki/pages/entities/innovation-pack.md
  passé status draft → active
- **Docs** : docs/CHANGELOG.md créé
- **Backups pré-modif** : `.backup-rollback/1777059931/`

Tests : bot démarre en 11s, 11/11 commandes chargées,
schedulers up, zéro erreur au boot.

## [2026-04-24] visual-refonte | 22 commandes polish premium

Refonte visuelle des 22 dernières commandes livrées (Innovation 1/3 +
Admin Rôles + Admin Logs) au standard premium Soulbot.

- **Helper partagé créé** : `bot/ui/panels/_premium-helpers.js`
  — factories V2 + embeds + scoring + confirm + status panels
- **Refondues** :
  - Innovation Pack 1/3 (11) : panels V2 riches (auditserver, dryrun,
    channelpermcheck), batch V2 (channeltemplate, exportdata, schedule),
    confirmations V2 (freeze, unfreeze, purgeemojis), embeds premium
    (nickrestore, rolesync, schedule create)
  - Admin Rôles (5) : V2 panels (rolelist, roleinfo) + embeds premium
    (createrole, editrole) + confirmation V2 (deleterole)
  - Admin Logs (6) : V2 panels (logs, logsview) + embeds premium
    (logsset, logstoggle, logstest) + confirmation V2 (logsreset)
- **Showcase auditserver** : hero score + 6 sections thématiques +
  barre de progression + top 3 recommandations + boutons re-auditer /
  export JSON
- **Fix critique** : `statusV2Panel()` remplace les embed dans les
  `interaction.update()` sur les flows V2 — évite le bug
  `MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2` qui aurait
  recassé les confirmations (spec Nathan section 5 contenait le bug)
- **Backup** : `.backup-rollback/visual-refonte-1777062905/`

Logique métier : zéro modification (spec respectée).
Tests : bot redémarre clean, 22/22 commandes chargées, zéro erreur.

## [2026-04-24] release | Bot v2.0.0 — Logs Ultimate (Vague 1)

Saut majeur de version 1.0.0 → 2.0.0. Codename : "Logs Ultimate".

**Vague 1 livrée :**
- Helper V3 : `bot/core/logs-v3-helper.js` (~470 l, caches mémoire,
  fire-and-forget, ring buffer, EventEmitter)
- 27 event types (vs 16 V2), 7 groupes
- 5 nouvelles tables SQL : routing, formats, filters, history, stats_daily
- ALTER `guild_log_config` + backfill V2 → V3 silencieux
- Panel V3 `;logs` avec emoji `cat_innovation` custom
- `;logssetup` : auto-create catégorie + 8 salons + routing complet
- `;logsstatus` : vue compacte
- Handler `logs-v3-handler.js` avec stubs "Vague 2" sur preset/theme/stats/groups/filters
- `bootstrapCache()` au boot dans ready.js
- package.json 2.0.0

**Rétrocompat V2 :**
- `logs-helper.js` intact, 13 listeners V2 continuent
- Commandes V2 refondues visuellement restent fonctionnelles

**Vagues suivantes (non livrées) :**
- Vague 2 : toggle/preset/filter/group + hooks mod + 6 listeners
- Vague 3 : format/color/icon/theme + view/search/stats/dashboard/export/import

Backups : `.backup-rollback/logs-v2-to-v3-1777066016/`

## [2026-04-24] save | Bot v2.0.0 — Architecture Logs V3

Sauvegarde de la réponse de livraison Vague 1 en 2 pages liées :

- **Decision** : `wiki/pages/decisions/2026-04-24-logs-v3-architecture.md`
  — ADR du saut version 1.0.0 → 2.0.0 + architecture V3 + alternatives
  considérées + conséquences (positives + trade-offs)
- **Entity** : `wiki/pages/entities/logs-v3-ultimate.md` — description
  pérenne du système (capacités, performance, rétrocompat, fichiers,
  tables SQL, 22 commandes des 3 Vagues, liens croisés)

Cross-links ajoutés dans les 2 pages :
- [[components-v2]], [[pattern-storage-separation]], [[freinage-mentor]],
  [[sub-agent-mentor]], [[admin-pack]], [[fichier-claude-md]],
  [[permissions-3-niveaux]]

Index mis à jour :
- Systèmes en prod : 6 → 7 (ajout logs-v3-ultimate)
- Décisions ADR : 7 → 8 (ajout 2026-04-24-logs-v3-architecture)
