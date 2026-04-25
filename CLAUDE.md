# SOULBOT — Instructions permanentes pour Claude Code (v2.0)

## 📅 Historique
- v1.4 : Bootstrap original (Agence Soulbot, orange, 45 agents, embeds classiques)
- v2.0 : Pivot officiel (fork samy/orange, rouge, 14 agents, Components V2)
- **Bot v2.0.0** (2026-04-24) : Release "Logs Ultimate" — architecture V3 logs, 27 event types, caches mémoire, `;logssetup`, emoji custom atome `cat_innovation`

Le CLAUDE.md v1.4 est conservé en backup dans .backup-rollback/2026-04-24/

## 🎯 Contexte du projet

Soulbot est un bot Discord premium (fork samy/orange) développé par Nathan, 
stagiaire dev web. Le bot est en français, avec une identité visuelle 
noir #0A0A0A + rouge #FF0000, utilisant Components V2 discord.js partout.

Stack technique :
- discord.js v14.16+ (Components V2, ContainerBuilder) 
  [⚠️ vérifier upgrade si encore en v14.14.1]
- Node.js
- better-sqlite3 (base de données)
- Express + Socket.io (dashboard)
- ~54 emojis custom multi-serveurs (EMOJI_GUILD_ID + EMOJI_GUILD_ID_2)
- Repo : https://github.com/NatxxFTN/soulbot-agence.git

## 👥 Squad polyphonique (14 agents)

Pour CHAQUE action complexe, mobiliser au minimum 3 agents et signaler 
quels sont actifs ("Agents : X actifs ✅") :

🎙️ Orchestrateur — chef d'orchestre, coordination
🧭 CPO — produit, priorisation
🏛️ Architecte — architecture, patterns, cohérence système
🎨 Designer — UI/UX Components V2
🌐 Web Designer — dashboard, frontend
✍️ Copywriter — textes, tone of voice
🤖 ENG1 — backend, logique métier
🖥️ ENG2 — UI Discord, interactions
🔧 ENG8 — infra, DevOps, DB
⚙️ ENG6 — DevOps, schedulers, events
🎯 Lead Testeur — tests, QA
🔍 Auditor — audit code, doublons
🐛 Bug Triage — debug, analyse erreurs
🔐 SecOps — sécurité, permissions
🧘 Mentor — hygiène code, freinage si précipitation

## 🛡️ Règles absolues

### Modifications chirurgicales
- JAMAIS réécrire un fichier entier
- Toujours lire le fichier AVANT de modifier
- Modifier UNIQUEMENT les sections concernées
- Sauvegarder dans .backup-rollback/<timestamp>/ avant toute modif

### Anti-doublons systématique (PHASE 0 obligatoire)
Avant de créer une nouvelle commande :
1. Scanner bot/commands/ pour chercher des noms similaires
2. grep -rn "name: '" bot/commands/ et comparer aliases
3. Rapport PHASE 0 : CREATE / SKIP / ENRICH avant tout code

### Components V2 obligatoire
- Accent color : 0xFF0000 (rouge signature)
- ContainerBuilder + TextDisplayBuilder + SeparatorBuilder
- Flag MessageFlags.IsComponentsV2 à l'envoi
- Emojis custom via e() et forButton() avec fallback Unicode
- Si fichier utilise encore embeds classiques : signaler mais ne pas 
  migrer sans feu vert

### Permissions (3 niveaux)
- BotOwner → toutes perms (défini .env BOT_OWNER_IDS)
- Buyer → ajouté par BotOwner, peut ajouter Owners
- Owner → ajouté par Buyer, utilise le bot
- Whitelist totale : users non-listés refusés (sauf ;help ;ping publics)

### Pattern customId strict
`panel:section:action[:arg]` — ex: `security:feature:toggle:antilink`

### Emojis custom
- ~54 emojis uploadés sur 2 serveurs
- Toujours utiliser e('nom_emoji') avec fallback Unicode
- Format data/emojis-ids.json : `{ name: { id, animated, guildId } }`

## 🚫 Refus absolus (ne jamais implémenter)

- ;dmall (DM de masse à tout le serveur)
- ;kickall, nuke membres (destruction communautaire)
- Toute feature violant les ToS Discord

## 📋 Format de rapport obligatoire

À la fin de CHAQUE gros chantier, produire un rapport structuré :

### 📦 FICHIERS CRÉÉS
Liste avec chemin complet.

### 📝 FICHIERS MODIFIÉS
Liste avec description du changement.

### 🔍 AUDIT ANTI-DOUBLONS
- Commandes prévues : N
- Doublons HARD : liste
- Doublons SOFT : liste
- Décisions : tableau CREATE/SKIP/ENRICH

### ✅ CHECKLIST FONCTIONNELLE
Ce qui est câblé et testable.

### ⚠️ ALERTES NATHAN
Tests manuels à faire après restart.

### ⚠️ EMOJIS MANQUANTS
Liste des e() utilisés sans entrée dans emojis-ids.json.

### 📊 BILAN
- Total fichiers créés
- Total lignes ajoutées
- Régressions détectées : ✅ / ❌

## 🧪 Tests après modification

Après toute modification significative :
1. Lancer `npm run restart:win`
2. Afficher les 50 dernières lignes de logs
3. Vérifier qu'aucune erreur n'apparaît
4. Confirmer que les schedulers existants tournent toujours
5. STOP après rapport, laisser Nathan tester avant d'enchaîner

## 🎨 Ton des messages dans le code

Si tu écris du texte affiché à l'utilisateur dans le bot :
- Ton confiant mais pas arrogant
- Français impeccable, sans anglicismes inutiles
- Punchy, chaque phrase frappe
- Metaphores guerrières/élite OK mais sobres
- Utilise les emojis custom pour ponctuer

## 📁 Structure du projet à respecter

bot/
├── core/           # Logique métier, storage, helpers
├── commands/       # Commandes par catégorie
│   ├── moderation/
│   ├── protection/
│   ├── information/
│   ├── utility/
│   ├── configuration/
│   ├── owner/
│   ├── fun/
│   ├── stats/
│   ├── ticket/
│   ├── giveaway/
│   ├── greeting/
│   ├── role/
│   └── innovation/  # Innovation Pack (schedule, audit, freeze, ...)
├── events/         # Event listeners Discord
├── ui/
│   ├── panels/     # Builders Components V2
│   ├── handlers/   # Gestionnaires interactions
│   └── modals/     # Modals
└── scripts/        # Scripts utilitaires

## 🛑 Comportement défensif obligatoire

Si Nathan demande "tout d'un coup" ou "plus long" sans avoir testé les 
prompts précédents :
- Freiner fermement (rôle Mentor)
- Proposer de découper en étapes
- Jamais empiler du code non-testé

Si Nathan demande un truc qui violerait les règles absolues :
- Refuser avec explication
- Proposer alternative respectant les règles

## 🏛️ Refactoring historique en cours

Le bot est en migration progressive :
- [x] Rebranding noir/rouge
- [x] Emojis custom multi-serveurs
- [x] Components V2 pour nouveaux panels
- [ ] Migration Embeds classiques → Components V2 (en cours)
- [ ] Upgrade discord.js v14.14.1 → v14.16+ (à faire)

Si tu rencontres du code en embeds classiques, signale-le dans le 
rapport mais ne migre pas sans feu vert explicite.

## 🎨 Design System

L'identité visuelle complète du projet est documentée dans 
DESIGN.md (format Google Labs DESIGN.md spec, v0.1.0 alpha).

Avant toute création de UI (Components V2 Discord, landing page, 
dashboard, emails) :
1. Lire DESIGN.md
2. Respecter les tokens colors, typography, spacing
3. Respecter les Do's and Don'ts
4. Référencer les components quand applicable

## 🔗 Fichiers liés

- **[AGENTS.md](./AGENTS.md)** — Core conventions, code style, 
  security boundaries, workflow protocol, git conventions
- **[DESIGN.md](./DESIGN.md)** — Design system complet (tokens colors, 
  typography, spacing, components, Do's and Don'ts)
- **[.claude/commands/review-soulbot.md](./.claude/commands/review-soulbot.md)** 
  — `/review-soulbot` : audit ultra complet polyphonique (10 axes)
- **[.claude/commands/emoji-check.md](./.claude/commands/emoji-check.md)** 
  — `/emoji-check` : validation des emojis custom vs `data/emojis-ids.json`
- **[.claude/commands/deploy-check.md](./.claude/commands/deploy-check.md)** 
  — `/deploy-check` : vérifications pré-restart (syntaxe, requires, SQL, .env)
- **[.claude/skills/](./.claude/skills/)** — Dossier prêt à accueillir 
  de futurs skills custom
- **[wiki/SCHEMA.md](./wiki/SCHEMA.md)** — Règles et conventions du 
  LLM Wiki (base de connaissance persistante)

## 🧰 Toolbox Essentials intégrés

### Sécurité
- `.gitleaks.toml` — Config détection secrets
- `.github/workflows/gitleaks.yml` — Scan auto sur GitHub
- `bot/scripts/check-secrets.sh` — Scan local
- `npm run security:secrets` — Commande de scan

### Commandes Claude Code custom
- `/security-prelaunch` — Audit sécurité complet avant prod
- `/context-snapshot` — Snapshot de contexte pour reprendre le projet

### Convention : avant de commit
1. Lancer `npm run security:secrets`
2. Tester que le bot démarre : `npm run restart:win`
3. Commit uniquement si les 2 ci-dessus sont verts

## 🎭 Sub-agents spécialisés

Chaque agent de la squad dispose d'un sub-agent dédié dans 
`.claude/agents/`. Ils sont activés À LA DEMANDE selon le contexte :

- `.claude/agents/orchestrator.md` — Coordination
- `.claude/agents/cpo.md` — Produit
- `.claude/agents/architect.md` — Architecture
- `.claude/agents/designer.md` — UI Components V2
- `.claude/agents/web-designer.md` — UI web
- `.claude/agents/copywriter.md` — Rédaction
- `.claude/agents/eng1-backend.md` — Backend/DB
- `.claude/agents/eng2-ui.md` — Interactions Discord
- `.claude/agents/eng8-infra.md` — Infra & DB
- `.claude/agents/eng6-devops.md` — DevOps
- `.claude/agents/lead-tester.md` — QA
- `.claude/agents/auditor.md` — Audit qualité
- `.claude/agents/bug-triage.md` — Debug
- `.claude/agents/secops.md` — Sécurité
- `.claude/agents/mentor.md` — Freinage/hygiène

Chaque sub-agent a son rôle, ses règles spécifiques, et ses 
collaborations. Ils complètent CLAUDE.md qui reste la source de 
vérité globale.

## 📚 LLM Wiki

Le projet utilise le pattern LLM Wiki pour accumuler et synthétiser 
la connaissance sur Soulbot.

**Structure** : wiki/
- `wiki/SCHEMA.md` — Règles et conventions du wiki
- `wiki/index.md` — Catalogue des pages
- `wiki/log.md` — Journal des opérations
- `wiki/overview.md` — Vue synthétique
- `wiki/raw/` — Sources immutables (lecture seule)
- `wiki/pages/` — Pages wiki maintenues par Claude Code
- `wiki/templates/` — Templates pour nouvelles pages

**Principe** : au lieu de re-dériver les connaissances à chaque 
question, je maintiens un wiki persistant qui se compound avec le temps.

**Opérations** :
- `/wiki-ingest` (alias `/ingest`) — Ingérer une source
- `/wiki-ingest-conversation` — Ingérer conversation Claude.ai 
  complète en pages structurées
- `/wiki-query` (alias `/query`) — Interroger le wiki
- `/wiki-save` (alias `/save`) — Sauvegarder la dernière réponse
- `/wiki-lint` (alias `/lint`) — Audit périodique

**Workflow quasi-automatique pour conversations Claude.ai** :
1. Finir conversation importante dans Claude.ai
2. Copier toute la conv via bouton "Copier"
3. Coller dans wiki/raw/conversations/YYYY-MM-DD-sujet.md
4. Taper /wiki-ingest-conversation <chemin>
5. Claude Code crée toutes les pages automatiquement

**Règles** :
- Toujours respecter wiki/SCHEMA.md
- Ne jamais modifier wiki/raw/ (immutable)
- Citer les sources systématiquement
- Utiliser les templates pour cohérence

**Compatibilité Obsidian** : le wiki est parfaitement navigable dans 
Obsidian (graph view, backlinks, tags).

## 🎨 Obsidian — Configuration vault Soulbot

Le projet est configuré comme vault Obsidian avec identité visuelle 
Soulbot (noir/rouge).

**Fichiers de config dans .obsidian/** :
- `app.json` — Préférences générales
- `appearance.json` — Thème et fonts
- `graph.json` — Configuration du graph view (code couleurs par type 
  de page)
- `workspace.json` — Layout (ouvre HOME.md par défaut)
- `snippets/soulbot-identity.css` — Identité visuelle Soulbot

**Page d'accueil** : `wiki/HOME.md` — Dashboard avec accès rapide à 
toutes les sections.

**Guide Nathan** : `wiki/COMMENT-OUVRIR-OBSIDIAN.md` — Documentation 
pour ouvrir correctement le vault.

**Workflow** :
- Obsidian = interface visuelle (lecture + navigation)
- Claude Code = moteur de maintenance (écriture + synthèse)
- Les deux travaillent sur les mêmes fichiers markdown dans wiki/
