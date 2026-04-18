# ⚡ Discord Manager

Bot Discord complet + Dashboard web sur `http://localhost:3000`

## 🚀 Installation rapide

```bash
cd discord-manager
npm install
cp .env.example .env
node index.js
```

Ouvre ensuite **http://localhost:3000** dans ton navigateur.

---

## ⚙️ Configuration (.env)

```env
DISCORD_TOKEN=ton_token_ici       # Token du bot Discord
CLIENT_ID=ton_client_id_ici       # Application ID
PREFIX=!                          # Préfixe par défaut
SESSION_SECRET=change_this        # Secret de session (change-le!)
PORT=3000                         # Port du dashboard
DASHBOARD_PASSWORD=admin123       # Mot de passe du dashboard
```

---

## 🎮 Dashboard

Mot de passe par défaut: `admin123`  
URL: `http://localhost:3000`

### Pages disponibles:
| Page | Description |
|------|-------------|
| Vue d'ensemble | Stats globales + graphiques |
| Serveurs | Liste des serveurs gérés |
| Logs de modération | Historique ban/kick/mute/warn |
| Avertissements | Gestion des warns + suppression |
| Logs de commandes | Toutes les commandes exécutées |
| Commandes custom | Créer des commandes personnalisées |
| Configuration | Paramètres par serveur |

### Données de démo
Sur l'écran de connexion, clique **"Charger des données de démo"** pour peupler la BDD avec des exemples.

---

## 🤖 Commandes du bot

### 🛡️ Modération
| Commande | Description |
|----------|-------------|
| `!ban @user [raison]` | Bannir un membre |
| `!kick @user [raison]` | Expulser un membre |
| `!mute @user [durée] [raison]` | Mettre en timeout (ex: `10m`, `1h`, `1d`) |
| `!warn @user [raison]` | Avertir un membre |
| `!warnings [@user]` | Voir les avertissements |
| `!unban <userID>` | Débannir un utilisateur |
| `!clear [1-100]` | Supprimer des messages |

### 🔧 Utilitaires
| Commande | Description |
|----------|-------------|
| `!help [commande]` | Liste des commandes |
| `!ping` | Latence du bot |
| `!serverinfo` | Infos sur le serveur |
| `!userinfo [@user]` | Infos sur un utilisateur |
| `!avatar [@user]` | Voir l'avatar |

### 🎮 Fun
| Commande | Description |
|----------|-------------|
| `!8ball <question>` | Boule magique |
| `!roll [faces]` | Lancer un dé |
| `!coinflip` | Pile ou face |

---

## 🔧 Auto-Modération

Configurable dans le dashboard (page Configuration):
- **Anti-spam** — Détecte les messages répétés
- **Anti-liens** — Bloque les URLs externes
- **Anti-majuscules** — Bloque les messages en CAPS excessif

---

## 📁 Structure du projet

```
discord-manager/
├── index.js              ← Point d'entrée (lance bot + dashboard)
├── .env                  ← Configuration (à créer depuis .env.example)
├── data.db               ← Base de données SQLite (auto-créée)
├── bot/
│   ├── index.js          ← Client Discord
│   ├── database.js       ← Schéma SQLite
│   ├── commands/
│   │   ├── moderation/   ← ban, kick, mute, warn, clear, unban
│   │   ├── utility/      ← help, ping, serverinfo, userinfo, avatar
│   │   └── fun/          ← 8ball, roll, coinflip
│   └── events/
│       ├── ready.js      ← Connexion + sync serveurs
│       ├── messageCreate.js ← Handler de commandes + auto-mod
│       └── guildMemberAdd.js ← Bienvenue + auto-role
└── dashboard/
    ├── server.js         ← API Express + Socket.io
    └── public/
        ├── index.html    ← App SPA
        ├── css/style.css
        └── js/app.js
```

---

## 📋 Inviter le bot

1. Va sur https://discord.com/developers/applications
2. Sélectionne ton application → OAuth2 → URL Generator
3. Coche: `bot`, `applications.commands`
4. Permissions: `Administrator` (ou personnalisées)
5. Copie l'URL et invite le bot

---

## 💡 Tips

- Le dashboard fonctionne **sans le bot** (mode dashboard seul)
- Toutes les données sont stockées localement dans `data.db`
- Le dashboard se met à jour en temps réel via Socket.io
- Les commandes custom sont actives dès leur création (pas de redémarrage)
