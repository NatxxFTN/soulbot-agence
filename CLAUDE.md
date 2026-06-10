# SOULBOT — CLAUDE.md v3.0
# Fichier de contexte projet pour Claude Code
# Auteur : Nathan (NatxxFTN) | Mis à jour : juin 2026

---

## 🎙️ REMISE EN CONTEXTE — LIS EN PREMIER

Tu reprends ce projet après une pause. Voici tout ce que tu dois savoir
avant de taper la moindre ligne de code.

---

## 👤 QUI JE SUIS

- **Nathan**, 17 ans, Bac Pro CIEL (Cybersécurité, Informatique et réseaux, ELectronique)
- Actuellement en stage web dev
- GitHub : **NatxxFTN**
- Travaille sur **Windows**, terminal **Git Bash** (MINGW64)
- **OpenCode** était mon outil AI CLI principal — maintenant tu prends le relais (Claude Code)
- Je valide **toujours** sur Discord ou dans le navigateur avant de commit

---

## 📦 LE PROJET : SOULBOT

Repo principal : `github.com/NatxxFTN/discord-manager`

### Stack technique
- **discord.js** v14.16+
- **better-sqlite3** (base de données locale)
- **Components V2** Discord (pas d'embeds classiques sauf cas justifié)
- **Node.js** runtime

### Identité visuelle (NON NÉGOCIABLE)
| Règle | Valeur |
|---|---|
| Couleur primaire | `#B600A8` (magenta) |
| Emojis | **Zéro emoji Unicode natif** — custom emojis discotools.xyz UNIQUEMENT |
| Réponses | Éphémères par défaut (`ephemeral: true`) |
| Logs publics | Canal de logs séparé du message éphémère |
| Format | Components V2 partout |

---

## 🏗️ ARCHITECTURE ACTUELLE

```
discord-manager/
├── bot/
│   ├── index.js              ← Point d'entrée principal
│   ├── core/
│   │   ├── CommandHandler.js ← Handler slash commands dynamique
│   │   ├── security-storage.js ← Storage SQLite sécurité commune
│   │   └── [autres core]
│   ├── commands/             ← 240+ commandes, organisées par catégorie
│   │   ├── moderation/
│   │   ├── utility/
│   │   ├── information/
│   │   ├── configuration/
│   │   ├── protection/
│   │   └── [autres catégories]
│   ├── utils/
│   │   └── embeds.js         ← Utilitaires visuels
│   └── database/             ← SQLite schemas + migrations
├── .env                      ← SECRETS — jamais commit
├── .env.example              ← Template sans valeurs
├── .gitignore                ← .env est dedans
├── CLAUDE.md                 ← CE FICHIER
├── DESIGN.md                 ← Règles design détaillées
└── docs/                     ← Documentation projet
```

### Squad 14 agents (architecture interne Claude Code)
Quand tu travailles sur ce projet, tu incarnes une squad :
🎙️ Orchestrateur · 🧭 CPO · 🏛️ Architecte · 🎨 Designer
✍️ Copywriter · 🤖 ENG1 · 🖥️ ENG2 · 🔧 ENG8 · ⚙️ ENG6
🎯 Lead Testeur · 🔍 Auditor · 🐛 Bug Triage · 🔐 SecOps · 🧘 Mentor

Polyphonie = min 3 agents actifs par section. Auto-audit en fin de prompt.

---

## ✅ CE QUI EST DÉJÀ EN PLACE

- [x] 240+ slash commands déployées
- [x] Système Logs V3 (logs séparés par catégorie d'action)
- [x] Components V2 panels sur toutes les commandes principales
- [x] Pack Forteresse sécurité (anti-spam, anti-links, anti-mentions, etc.)
- [x] Infrastructure SQLite avec storage sécurité commun
- [x] Panel central `/security` avec toggles
- [x] `/whitelist`, `/blacklist`, `/securitylogs`
- [x] Module ServerForge (génération serveur via `/generate` depuis `template.json`)
- [x] Système de rôles Buyer/Owner/BotOwner
- [x] Landing page Soulbot (React/TypeScript/Tailwind/Framer Motion, palette magenta)

---

## ⚠️ PROBLÈME .env À CORRIGER EN PREMIER

Le `.env` contient une **erreur de formatage sur le token Discord**.
Le token a été mal formaté (probablement une faute de frappe ou un espace parasite).

**Action obligatoire avant tout :**

1. Ouvre `.env`
2. Vérifie la ligne `DISCORD_TOKEN=`
3. Assure-toi qu'il n'y a :
   - PAS d'espace avant ou après le `=`
   - PAS de guillemets autour du token
   - PAS de saut de ligne ou caractère invisible
   - Le token est au format exact : `MTxxxxxxxx.Gxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. Si le token est invalide → va sur Discord Developer Portal → ton app → Bot → "Reset Token" → copie le NOUVEAU token → colle-le dans `.env`

Format correct :
```
DISCORD_TOKEN=MTxxxxxxxxxxxxxxxxxxxxxxxx.Gxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLIENT_ID=123456789012345678
```

Teste avec : `node bot/index.js` — tu dois voir `[✓] Connecté en tant que Soulbot#XXXX`

---

## 🔮 PROCHAINES FONCTIONNALITÉS À DÉVELOPPER

### Soulbot Network (4 bots spécialisés)
Le projet monte en échelle : Soulbot hub → 4 bots satellites

| Bot | Rôle |
|---|---|
| **SoulMod** | Modération avancée autonome |
| **SoulStats** | Statistiques serveur + leaderboards |
| **SoulEvent** | Gestion d'événements Discord |
| **SoulGuard** | Protection & sécurité dédiée |

Chaque bot aura son propre repo, sa propre identité mais partage la palette magenta.

### Autres features en attente
- Dashboard web (React + Socket.io, stats temps réel)
- Système d'abonnements/tiers utilisateurs
- API REST publique pour les admins
- Intégration webhooks Discord
- Panel configuration full UI (sans avoir à taper des commandes)

---

## 📏 RÈGLES ABSOLUES DU PROJET

1. **BACKUP AVANT TOUTE MODIFICATION MAJEURE**
   ```bash
   cp -r . ../backup-$(date +%Y%m%d-%H%M%S)
   ```
   Ou via Git : `git stash` si sur une branche propre.

2. **MODIFICATIONS CHIRURGICALES** — touche uniquement les fichiers concernés.
   Ne refactorise pas tout le projet quand on te demande de modifier une commande.

3. **TESTER SUR DISCORD** avant tout commit. Nathan valide visuellement.

4. **PAS DE RÉGRESSION** — si tu modifies un fichier, les commandes qui marchaient
   déjà doivent continuer à marcher.

5. **ZÉRO EMOJI UNICODE** dans les réponses bot. Custom emojis ou rien.

6. **LOGS SÉPARÉS** — la réponse éphémère + le log public canal ne se mélangent pas.

7. **FREINAGE AUTOMATIQUE** — si une demande est floue ou ambiguë, tu demandes
   clarification AVANT de coder. Mieux vaut 2 min de question que 30 min de
   refacto.

---

## 🛠️ WORKFLOWS STANDARDS

### Démarrer le bot
```bash
cd discord-manager
node bot/index.js
```

### Déployer les slash commands
```bash
node bot/deploy-commands.js
```

### Vérifier les logs en temps réel
```bash
node bot/index.js 2>&1 | tee logs/session.log
```

### Commit propre
```bash
git add .
git status          # vérifie qu'il n'y a pas .env
git commit -m "feat(module): description concise"
git push origin main
```

---

## 🎤 VOICE INPUT (NOUVEAU)

Pour parler à Claude Code vocalement, installe **`speakeasy`** ou utilise
le pipeline suivant sous Windows :

### Option A — PowerShell + Windows Speech Recognition
```powershell
# Activer Windows Speech Recognition
# Panneau de configuration → Reconnaissance vocale → Démarrer
# Puis dans Git Bash : les commandes dictées s'insèrent directement
```

### Option B — Whisper local (recommandé, plus précis)
```bash
# Installe whisper CLI
pip install openai-whisper

# Enregistre ta voix + transcrit
whisper audio.wav --language French --model small
```

### Option C — speakeasy (intégration directe CLI)
```bash
npm install -g @anthropic-ai/speakeasy
# Puis dans Claude Code :
speakeasy start   # active la voix dans la session courante
```

*Note : vérifie la doc actuelle de Claude Code pour la commande exacte,
ça évolue vite.*

---

## 📞 CONTACT / CONTEXTE PERSO

- Discord : PAQUIGROS server (serveur communauté Nathan)
- Hébergement bot : KataBump (ou machine locale selon la session)
- Modèle utilisé : **Claude Sonnet 4.6** (claude.ai) → maintenant **Claude Code**
  avec accès au modèle **Claude Opus 4.6** pour les tâches lourdes

---

*Ce fichier doit rester à jour. Mets-le à jour après chaque session majeure.*
