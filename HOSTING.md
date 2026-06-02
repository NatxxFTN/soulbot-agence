# GUIDE D'HÉBERGEMENT — Discord Manager Bot

## 1. Prérequis serveur

- **Node.js** v18+ (v20 recommandé)
- **npm** (inclus avec Node.js)
- **Git** (optionnel, pour cloner)
- **PM2** (recommandé pour 24/7) : `npm install -g pm2`

## 2. Installation

```bash
# Extraire le projet
cd /chemin/vers/discord-manager

# Installer les dépendances
npm install

# Copier la configuration
cp .env.example .env
```

## 3. Configuration (.env)

```env
DISCORD_TOKEN=ton_token_ici
CLIENT_ID=ton_client_id_ici
PREFIX=;
BOT_OWNERS=ton_id_discord_ici
SESSION_SECRET=une_chaine_aleatoire_securisee
PORT=3000
DASHBOARD_PASSWORD=admin123
```

## 4. Lancer le bot

```bash
# Bot uniquement
npm run bot

# Bot + Dashboard
npm start

# Mode développement (hot-reload)
npm run dev
```

## 5. Production avec PM2 (recommandé)

```bash
pm2 start bot/index.js --name discord-manager
pm2 save
pm2 startup    # redémarrage auto au boot

# Logs
pm2 logs discord-manager

# Redémarrer
pm2 restart discord-manager
```

## 6. Structure importante

| Fichier / Dossier | Rôle |
|---|---|
| `bot/index.js` | Point d'entrée du bot |
| `dashboard/server.js` | Dashboard web |
| `package.json` | Scripts : `npm run bot`, `npm start`, `npm run dashboard` |
| `.env` | Configuration sensible (token, IDs) |
| `.agents_tech/` | Documentation technique IA de l'agence Soulbot |

## 7. Commandes utiles

```bash
npm run bot          # Lancer le bot seul
npm run dashboard    # Lancer le dashboard seul
npm start            # Bot + Dashboard
npm run restart:win  # Redémarrage (Windows)
npm run security:secrets  # Vérifier les secrets
```

## 8. Notes

- Le bot utilise **better-sqlite3** (base locale) — pas besoin de base distante
- Le dashboard écoute sur le port défini dans `.env` (défaut: 3000)
- Pour exposer le dashboard sur internet, utiliser un reverse proxy (nginx, caddy) ou serveur
