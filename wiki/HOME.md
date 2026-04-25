---
title: Soulbot Second Brain
type: home
tags: [home, dashboard]
---

# 🧠 SOULBOT — Second Cerveau

> *Le second cerveau de Nathan pour le développement de Soulbot.*
> *Maintenu automatiquement par Claude Code. Navigable par Obsidian.*

---

## 🚀 Accès rapide

### 📖 Vue d'ensemble
- [[overview|🎯 Vue d'ensemble du projet]]
- [[index|📚 Index complet du wiki]]
- [[log|📜 Journal des opérations]]
- [[SCHEMA|📐 Schéma du wiki]]

### 🧭 Navigation par type

| Catégorie | Description | Pages |
|-----------|-------------|-------|
| 🎭 **Entités** | Fichiers, sub-agents, systèmes, packs | 29 |
| 📜 **Décisions** | Architecture Decision Records | 7 |
| 💡 **Concepts** | Idées et principes fondamentaux | 7 |
| 🔗 **Synthèses** | Analyses thématiques | 5 |
| ⚖️ **Comparaisons** | Comparaisons d'options | 3 |
| 📥 **Sources** | Conversations, articles | 1 |

---

## 🎯 Chantiers en cours

Voir [[pipeline-chantiers-en-cours]]

### 🔴 Prioritaire
- [ ] Tests sub-agents (.claude/agents/)
- [ ] Validation [À VALIDER NATHAN] sur 20+ pages wiki
- [ ] Installation Gitleaks
- [ ] Fix bug stats.js:43

### 🟠 À venir
- [ ] Admin Pack (PHASE 0 validée)
- [ ] Advanced Tools Pack
- [ ] Landing page premium

---

## 🎨 Identité visuelle

- **Background** : `#0A0A0A` (noir profond)
- **Accent** : `#FF0000` (rouge Soulbot)
- **Typographie** : Instrument Serif + Inter + JetBrains Mono
- **Framework UI** : Components V2 (Discord)

Voir [[fichier-design-md|DESIGN.md]] pour la source de vérité complète.

---

## 🎭 La Squad

15 sub-agents spécialisés dans `.claude/agents/` :

**🎙️ Coordination**
- [[sub-agent-orchestrator]] — Chef d'orchestre
- [[sub-agent-cpo]] — Priorisation produit
- [[sub-agent-mentor]] — Freinage/hygiène

**🏛️ Design & Architecture**
- [[sub-agent-architect]] — Architecture
- [[sub-agent-designer]] — UI Components V2
- [[sub-agent-web-designer]] — UI web
- [[sub-agent-copywriter]] — Rédaction

**🤖 Développement**
- [[sub-agent-eng1-backend]] — Backend/DB
- [[sub-agent-eng2-ui]] — Interactions Discord
- [[sub-agent-eng8-infra]] — Infra & DB
- [[sub-agent-eng6-devops]] — DevOps

**🔍 Qualité & Sécurité**
- [[sub-agent-lead-tester]] — QA
- [[sub-agent-auditor]] — Audit qualité
- [[sub-agent-bug-triage]] — Debug
- [[sub-agent-secops]] — Sécurité

---

## 🛠️ Commandes Claude Code

### Wiki (pattern Karpathy)
- `/wiki-ingest` — Ingérer une source dans wiki/raw/
- `/wiki-ingest-conversation` — Ingérer conversation Claude.ai
- `/wiki-query` (alias `/query`) — Interroger le wiki
- `/wiki-save` (alias `/save`) — Sauvegarder réponse riche
- `/wiki-lint` (alias `/lint`) — Audit santé

### Sécurité
- `/security-prelaunch` — Audit pré-prod complet
- `/context-snapshot` — Snapshot du projet

---

## 📜 Décisions récentes

- [[2026-04-24-pivot-identite-rouge]] — Pivot orange → rouge
- [[2026-04-24-adoption-design-md]] — Format Google Labs
- [[2026-04-24-squad-14-agents]] — Polyphonie
- [[2026-04-24-pattern-sub-agents]] — .claude/agents/
- [[2026-04-24-llm-wiki-phase-a]] — Structure LLM Wiki
- [[2026-04-24-components-v2-vs-embeds]] — Framework UI
- [[2026-04-24-better-sqlite3-choix]] — Driver DB

---

## 🎯 Workflow quotidien

1. **Ouvrir** VS Code + Obsidian côte à côte
2. **Commencer** par `/context-snapshot` dans Claude Code
3. **Coder** avec les sub-agents (invoke via `Utilise le sub-agent X`)
4. **Sauvegarder** les réponses intéressantes avec `/save`
5. **Finir** par un commit clean (après `npm run security:secrets`)

---

*Dernière mise à jour auto : 2026-04-24*
