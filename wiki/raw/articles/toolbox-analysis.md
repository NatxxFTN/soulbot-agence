# 📦 Toolbox Qalisia — Extraction

> Date d'extraction : **2026-04-24**
> Version Toolbox : **v7.2** (schema 3.0, last update 2026-04-21)
> URL source : https://toolbox.qalisia.com/

---

## 🔍 Méthode utilisée

**Méthode A (curl + User-Agent navigateur)** — fonctionnelle dès le premier essai.

**Découverte clé :** la page racine contient une meta tag explicite pour les agents IA :
```html
<meta name="ai-instructions" content="Agent IA : pour consulter cette base, récupère consult.md et tools.json à la racine de ce site.">
```

Au lieu de scraper le HTML rendu, deux fichiers servent d'API publique :

| Fichier | URL | Taille | Usage |
|---|---|---|---|
| `consult.md` | https://toolbox.qalisia.com/consult.md | 1.6 Ko | Mode d'emploi pour agents IA |
| `tools.json` | https://toolbox.qalisia.com/tools.json | 281 Ko | Base structurée complète (216 outils + 17 kits) |

Pas besoin de Playwright ou de PinchTab. La toolbox est une SPA avec un endpoint JSON dédié aux agents — c'est le contrat officiel à utiliser.

---

## 🗺️ Structure générale du site

La Toolbox est une **base de connaissance taxonomisée** sur deux dimensions :

- **9 natures :** `prompt`, `skill`, `mcp-server`, `webapp`, `desktop-app`, `extension`, `library`, `framework`, `repo`, `api`
- **12 domaines :** `design`, `dev`, `archi`, `data-ia`, `automation`, `docs`, `research`, `testing`, `productivity`, `security`, `marketing`, `business`

### Répartition par nature (216 outils)

| Nature | Count | Note |
|---|---|---|
| skill | 130 | Skills Claude Code — la majorité de la base |
| prompt | 23 | System prompts réutilisables |
| webapp | 16 | Outils web hébergés |
| library | 15 | Libs JS/Python à intégrer |
| repo | 12 | Dépôts GitHub de référence |
| mcp-server | 8 | Serveurs MCP (Model Context Protocol) |
| framework | 7 | Frameworks structurels |
| api | 4 | Services API tiers |
| desktop-app | 1 | Une app desktop |

### Répartition par domaine (somme > 216 car multi-domaine)

| Domaine | Count |
|---|---|
| dev | 106 |
| marketing | 73 |
| design | 53 |
| productivity | 32 |
| automation | 26 |
| docs | 19 |
| security | 19 |
| business | 17 |
| data-ia | 12 |
| research | 9 |
| testing | 9 |
| archi | 7 |

### Statut & pricing

- **Status** : 116 `adopted` · 89 `discovered` · 7 `evaluated` · 2 `trial` · 1 `archived` · 1 `active`
- **Pricing** : 159 `open-source` · 44 `free` · 12 `freemium` · 1 `paid`

### Format d'un outil (schema)

```jsonc
{
  "id": "skill-018",
  "name": "claude-mem",
  "author": "thedotmack",
  "nature": "skill",
  "domains": ["productivity", "dev"],
  "description": "...",
  "url": "https://github.com/...",
  "tags": ["..."],
  "compatibleWith": ["Claude Code", "..."],
  "useCases": ["..."],
  "addedDate": "2026-03-21",
  "source": "github-trending",
  "status": "adopted | evaluated | discovered | trial | archived",
  "pricing": "open-source | free | freemium | paid",
  "relations": { "partOfKit": [], "alternativeTo": [], "requires": [], "enhances": [] },
  "notes": "..."
}
```

---

## 🎁 17 Kits (combinaisons pré-assemblées)

Les **kits** sont la valeur ajoutée principale de la toolbox — des packs cohérents prêts à activer.

| Kit | Domaines | Outils | Usage |
|---|---|---|---|
| **kit-design-ui** | design | 6 | Concevoir des interfaces sans Figma (Pro Max + Anthropic frontend-design) |
| **kit-claude-productivity** | productivity, dev | 3 | Anti-dégradation contexte + réduction tokens + mémoire persistante |
| **kit-web-designer-agent** | design, dev | 15 | Stack complète sites web animés (shadcn ×2, 21st.dev, Framer Motion) |
| **kit-seo** | marketing | 4 | SEO outils |
| **kit-marketing-business** | marketing, business | 4 | Marketing + business |
| **kit-automation-cli** | automation, productivity | 5 | Automatisation CLI |
| **kit-code-intelligence** | dev, archi | 5 | Compréhension de code (Graphify, Understand-Anything…) |
| **kit-agent-builder** | dev, productivity, archi | 6 | Construire ses propres agents |
| **kit-memory-context** | productivity, dev | 5 | Mémoire & contexte long terme |
| **kit-saas-stack** | dev | 8 | Stack SaaS gratuite (Supabase, Vercel, Clerk, Sentry, Resend, PostHog, Cloudflare…) |
| **kit-admin-compta-france** | business, automation, docs | 2 | Compta FR |
| **kit-security-prelaunch** | security, dev | 6 | Sécurité avant mise en prod |
| **kit-a11y-quality** | design, testing, dev | 4 | Accessibilité WCAG |
| **kit-ui-polish** | design, dev | 5 | Micro-détails UI |
| **kit-data-scraping** | data-ia, automation, research | 6 | Scraping & data |
| **kit-orchestration-agents** | dev, archi, automation | 4 | Orchestration multi-agents |
| **kit-content-pipeline** | docs, automation | 6 | Pipeline de contenu |

---

## 📋 Contenu par catégorie (top picks par domaine)

> Inventaire complet : 216 entrées dans `./.tmp-toolbox/all-summaries.json` (à supprimer après lecture).
> Ci-dessous, les outils les plus pertinents par catégorie pour un projet bot Discord Node.js.

### 🛠️ Dev / Architecture (106 outils dev)

| Nom | Nature | Statut | Description |
|---|---|---|---|
| **Graphify** | skill | adopted | Knowledge graph d'un repo via tree-sitter (23 langages) — onboarder une codebase, identifier god nodes, -71x tokens |
| **claude-mem** | skill | evaluated | Mémoire persistante Claude Code, compression IA, recherche sémantique SQLite+Chroma, 52.6k stars |
| **cost-reducer** | skill | adopted | Optimisation coûts API : routing, caching (-90%), batch (-50%), dashboard |
| **claude-skills (secondsky)** | repo | evaluated | 167 skills Claude Code prod-ready (frontend, design, Cloudflare, IA, API, mobile, testing) |
| **claude-skills (alirezarezvani)** | repo | discovered | 177 skills plug-and-play |
| **awesome-claude-code** | repo | discovered | Liste curatée 14k+ stars (skills, agents, plugins, hooks) |
| **agency-agents** | repo | discovered | Personnalités d'agents IA pour 15+ divisions (eng, design, sales…) |
| **BMAD Method** | framework | discovered | Framework agile IA — 34+ workflows brainstorming → déploiement, 12+ agents spécialisés |
| **GSD-2** | framework | discovered | CLI agent autonome TS basé SDK Pi d'Anthropic |
| **OpenCLI** | library | discovered | Transforme n'importe quel site / Electron / CLI en CLI standardisé. Réutilise session Chrome. -93% tokens |
| **ccstatusline** | library | discovered | Status line custom pour Claude Code (modèle, contexte, conso) |
| **Pinchtab** | library | discovered | Contrôleur navigateur ultra-léger (binaire Go 15 Mo, HTTP localhost) |
| **public-apis** | repo | discovered | Répertoire massif d'APIs publiques classées par domaine |

### 🔐 Sécurité (19 outils)

| Nom | Nature | Statut | Description |
|---|---|---|---|
| **MCP Sentinel** | skill | adopted | Scan skills/MCP installés vs 6 bases de menaces (GitHub Advisory, vulnerablemcp.info, mcpscan.ai, Snyk…) |
| **Gitleaks** | skill | adopted | Scanner secrets dans code + historique Git (API keys, tokens, mdp) |
| **security** | skill | adopted | Audit full-stack 11 phases (recon, headers, TLS, injections, auth, CVE, SAST semgrep, OWASP Top 10) |
| **LLM Guard** | library | adopted | Toolkit sécurité interactions LLM — 15 scanners input (injection, PII, secrets, toxicité) |
| **OWASP ZAP** | webapp | adopted | Proxy DAST OWASP — XSS, SQLi, CSRF, misconfigs |
| **Shannon** | library | discovered | Pentester IA white-box, exécute de vrais exploits |
| **Snyk** | webapp | adopted | Scan deps + container + IaC |
| **Secure Authentication Audit** | prompt | discovered | Audit auth (hash mdp, expiration sessions, vérif email, rate limit logins) |
| **Secure Deployment & Monitoring** | prompt | discovered | HTTPS, secrets, BDD non exposée, logging tentatives auth |
| **Secrets & API Keys Protection** | prompt | discovered | Scan secrets, migration env vars |
| **Anti-Abuse & Rate Limiting** | prompt | discovered | Rate limit logins, endpoints API, création comptes |
| **Input Validation & Sanitization** | prompt | discovered | Validation entrées utilisateur |
| **IDOR Prevention Audit** | prompt | discovered | Vérif d'accès aux ressources |
| **Trivy** | library | adopted | Scan vulnérabilités containers / IaC / repos |
| **secure-mcp-install** | skill | discovered | Audit avant install d'un MCP |

### 🎨 Design / UI (53 outils)

| Nom | Nature | Statut | Description |
|---|---|---|---|
| **frontend-design** (Anthropic) | skill | adopted | Skill officiel Anthropic frontend |
| **shadcn-ui (developer-kit)** | skill | adopted | Stack shadcn/ui complète |
| **tailwind-v4-shadcn** | skill | adopted | Tailwind v4 + shadcn |
| **framer-motion-skill** | skill | adopted | Animations Framer Motion |
| **emilkowalski-skill** | skill | adopted | Patterns d'animation polish |
| **refactoring-ui** | skill | adopted | Heuristiques d'amélioration UI |
| **Brand Guidelines (Anthropic)** | skill | adopted | Skill brand officiel |
| **theme-factory** | skill | adopted | Génération de thèmes |
| **make-interfaces-feel-better** | skill | adopted | Polish micro-détails |
| **wcag-accessibility-audit** | skill | adopted | Audit accessibilité WCAG |
| **Prompts Design Systems & Creative Strategy** | prompt | adopted | 5 system prompts (Design System Architect, Brand Identity Strategist…) |
| **LogoCreator** | webapp | discovered | Générateur de logos IA open source |
| **Excalidraw** | webapp | adopted | Wireframes / schémas |

### 🧪 Testing / QA (9 outils)

| Nom | Nature | Statut | Description |
|---|---|---|---|
| **Playwright MCP** | mcp-server | adopted | Claude navigue/teste UI comme un utilisateur |
| **Playwright CLI** | library | discovered | CLI stateless, -4x tokens vs MCP |
| **webapp-testing** | skill | adopted | Tests unit/intégration/E2E avec Claude Code |
| **Superpowers** | skill | adopted | Pack QA |
| **Quality Gate Contenu** | skill | adopted | Gate qualité avant publication |

### 🤖 Automation / Agents (26 outils)

| Nom | Nature | Statut | Description |
|---|---|---|---|
| **n8n** | skill | adopted | Ingénierie n8n complète (REST, JSON, custom nodes TS, Python) |
| **n8n-MCP** | skill | adopted | n8n via MCP |
| **Apify MCP Server** | mcp-server | discovered | Scraping (IG, LinkedIn, Maps…) via Claude Code |
| **Camofox Browser** | library | evaluated | Anti-detection browser pour agents (fork Firefox, fingerprint spoofing C++) |
| **Scrapling** | library | discovered | Framework scraping Python adaptatif |
| **Autensa (Mission Control)** | webapp | discovered | Dashboard centralisé pour gérer flotte d'agents |

### 💼 SaaS Stack gratuite (kit-saas-stack)

| Service | Usage |
|---|---|
| **Supabase** | BDD Postgres + auth + storage |
| **Supabase MCP** | Supabase via Claude Code |
| **Vercel** | Hosting frontend |
| **Cloudflare** | CDN, DNS, Workers, R2 |
| **Clerk** | Auth (login social, MFA, organisations) |
| **Sentry** | Monitoring erreurs |
| **Resend** | Envoi d'emails transactionnels |
| **PostHog** | Analytics produit + feature flags |

### 📚 Documentation (19 outils)

- **doc-coauthoring** — Skill rédaction docs collaborative
- **PDF / DOCX / PPTX / xlsx** (Anthropic) — Skills export/import bureautique
- **obsidian-skills** — Skills pour Obsidian
- **Notion MCP** — Notion via Claude Code

### 🧠 Productivity / Memory (32 outils)

- **get-shit-done (gsd-build)** — Méta-prompt anti-dégradation contexte (Amazon, Google, Shopify)
- **Mémoire Persistante** — 3 fichiers (recent-memory 48h, …)
- **Veille Automatique** — Scout web/Reddit/HN automatisé, planifiable cron
- **architecte-prompts** — Prompts d'architecture
- **Prompt Engineering Bootstrap** — Bootstrap prompting
- **claude-reflect** — Réflexion structurée

---

## 🔗 Liens externes mentionnés

### Hôtes principaux

| Hôte | Count | Type |
|---|---|---|
| github.com | 153 | Repos open-source |
| instagram.com (+ www.) | 20 | Posts source de découverte (genzbestie, etc.) |
| Services SaaS | 13 | supabase.com, vercel.com, clerk.com, cloudflare.com, sentry.io, resend.com, posthog.com, snyk.io, huggingface.co, 21st.dev, uiverse.io, smithery.ai, agentskill.sh |
| Autres | divers | excalidraw.com, pencil.dev, vibeprospecting.ai, omma.build, instantly.ai, mapileads.com, zaproxy.org |

### Inventaire ciblé (échantillon — voir `tools.json` pour les 216 URLs)

Tous les outils marqués `repo` ou `skill` open-source pointent vers github.com avec leur dépôt source d'install.

---

## 💎 Pépites remarquables

> Sélection subjective des items qui sortent du lot.

1. **Le contrat ai-instructions de la toolbox elle-même** — La meta tag `<meta name="ai-instructions">` qui pointe vers `consult.md` + `tools.json` est elle-même une pépite : un pattern simple à reproduire pour exposer **n'importe quelle base de connaissance** aux agents IA sans scraping. À noter pour le futur dashboard Soulbot.

2. **claude-mem (52.6k stars)** — Mémoire persistante Claude Code basée sur SQLite + Chroma. Pertinent vu que Soulbot utilise déjà SQLite. Web viewer sur `localhost:37777`.

3. **Graphify** — -71x tokens par requête en transformant le repo en knowledge graph. Idéal pour onboarder Claude Code sur le repo Soulbot (260+ commandes à terme).

4. **MCP Sentinel** — Audit de sécurité des skills/MCP installés vs 6 bases de menaces. À installer **avant** d'ajouter d'autres MCP.

5. **Le pack "Genzbestie" (Instagram)** — 6 prompts sécurité courts et actionnables (Auth Audit, Secrets Protection, Anti-Abuse, Input Validation, IDOR, Deployment) qui forment un mini-checklist pré-prod cohérent. Le `kit-security-prelaunch` les regroupe.

6. **OpenCLI** — Transformer n'importe quel site en CLI réutilisant la session Chrome — gain -93% tokens. Pertinent pour scripts d'admin sur Discord Developer Portal, Stripe Dashboard, etc.

7. **agency-agents** — Templates de personnalités d'agents par division. Inspiration directe pour la squad de 14 agents de Soulbot.

8. **Vérificateur Anti-IA** — Prompt FR qui scanne 24 formulations robot interdites + accents manquants + score 0-100. Très aligné avec la charte de ton Soulbot ("chaque phrase frappe", "français impeccable").

9. **n8n + n8n-MCP** — Skill complet (REST API, JSON workflows, custom nodes TS) pour automatiser les tâches récurrentes hors-bot (rapports, backups, alertes).

10. **BMAD Method** — Framework agile IA avec 12+ agents spécialisés (PM, Architecte, Dev, UX/UI). Comparable à l'approche Squad polyphonique de Soulbot — vaut le coup d'analyser leur découpage.

---

## 📂 Fichiers téléchargeables

La Toolbox elle-même expose deux fichiers téléchargeables :

| URL | Type | Usage |
|---|---|---|
| https://toolbox.qalisia.com/consult.md | Markdown | Instructions agent IA (1.6 Ko) |
| https://toolbox.qalisia.com/tools.json | JSON | Base complète 216 outils (281 Ko) |

**Aucun zip / archive / template binaire** n'est servi directement par la toolbox. Tout est lien GitHub vers les dépôts sources.

---

## 🎯 Recommandation rapide pour Soulbot

> Stack rappel : Discord.js v14.16+ · Node.js · better-sqlite3 · Express + Socket.io · Components V2 · 14 agents polyphoniques · identité noir/rouge

### 🟢 À adopter immédiatement (faible effort, fort impact)

1. **`Gitleaks`** — Scan secrets dans le repo + l'historique Git. Le bot manipule des tokens Discord, des IDs serveurs, peut-être des Stripe à terme. À mettre en pre-commit hook + en CI.
2. **`MCP Sentinel`** — Avant d'installer d'autres MCP/skills sur ce projet, lancer un audit. Coût zéro, prévention high.
3. **`get-shit-done`** + **`claude-mem`** — Le combo anti-dégradation contexte + mémoire persistante. Soulbot grossit (216 commandes prévues), c'est exactement le pattern qui sature Claude Code.
4. **`Graphify`** — Onboarder Claude sur le repo en quelques secondes. Transforme bot/commands/ + bot/core/ + bot/ui/ en knowledge graph requêtable. -71x tokens revendiqués.
5. **Le pack 6 prompts Genzbestie sécurité** — `Secure Auth`, `Secrets & API Keys`, `Anti-Abuse & Rate Limiting`, `Input Validation`, `IDOR`, `Secure Deployment`. Mini-checklist pré-prod. Aligné avec le rôle SecOps de la squad.

### 🟡 À évaluer (effort moyen, dépend de la roadmap)

6. **`Vérificateur Anti-IA`** — Très aligné avec la charte de ton Soulbot ("punchy, chaque phrase frappe, français impeccable"). À brancher sur le linter de textes utilisateurs.
7. **`Playwright MCP` + `Playwright CLI`** — Quand le dashboard web sera là, tests E2E. Le CLI est plus économe en tokens.
8. **`webapp-testing`** + **`Superpowers`** — Quand la base de tests sera lancée.
9. **`Sentry` + `PostHog` + `Resend`** — Si la roadmap prévoit dashboard public + emails de notification (premium, alertes admin).
10. **`n8n` + `n8n-MCP`** — Pour les automatisations hors-bot (rapports, backups SQLite, monitoring uptime).

### 🔴 À ignorer pour l'instant (hors scope)

- **`SpacetimeDB`** — Tu utilises better-sqlite3, pas besoin d'une BDD-backend hybride.
- **`Supabase` / `Clerk`** — Tu n'as pas besoin d'auth web pour le bot Discord lui-même (Discord OAuth au pire). Pertinent uniquement si tu fais un dashboard premium avec login.
- **Tout le pôle marketing/SEO/scraping** (~75 outils) — Hors scope produit Soulbot.
- **`BMAD Method`** — Intéressant pour s'inspirer de leur découpage d'agents, mais ne pas adopter le framework entier (Soulbot a déjà sa propre Squad de 14 agents documentée dans CLAUDE.md).

### 🎁 Kit recommandé en priorité absolue

**`kit-security-prelaunch`** (6 outils) — C'est le kit le plus aligné avec ton statut actuel de projet en pré-prod, et le plus critique avant de pousser le bot sur des serveurs tiers.

**`kit-claude-productivity`** (3 outils) — Le combo anti-dégradation pour que Claude Code reste performant sur la durée du projet.

---

## 📎 Annexes

- Données brutes conservées dans : `./.tmp-toolbox/consult.md`, `./.tmp-toolbox/tools.json`, `./.tmp-toolbox/all-summaries.json`, `./.tmp-toolbox/soulbot-relevant.json`
- Pour mise à jour : refaire `curl -sA "Mozilla/5.0" https://toolbox.qalisia.com/tools.json -o ./.tmp-toolbox/tools.json` (le `meta.version` te dit si ton collègue a publié une nouvelle version).
- Schéma de l'objet outil documenté dans `consult.md` directement.

> Rapport généré par la Squad polyphonique : 🎙️ Orchestrateur · 🏛️ Architecte · 🔍 Auditor · 🔐 SecOps · 🧭 CPO (5 actifs ✅)
