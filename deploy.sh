#!/bin/bash

# ─── Soulbot – Déploiement automatique ───────────────────────────────
# Usage : bash deploy.sh
# À exécuter sur un VPS Linux propre (Debian/Ubuntu)
# ──────────────────────────────────────────────────────────────────────

set -e

echo "╔══════════════════════════════════════╗"
echo "║     SOULBOT – AUTO DEPLOY v1.0       ║"
echo "╚══════════════════════════════════════╝"

# 1. Vérifier / installer Node.js 20
if ! command -v node &> /dev/null; then
  echo "[1/6] Installation de Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1/6] Node.js $(node -v) déjà installé"
fi

# 2. Installer PM2 globalement
echo "[2/6] Installation de PM2..."
npm install -g pm2

# 3. Naviguer dans le dossier du projet
cd "$(dirname "$0")"

# 4. Installer les dépendances
echo "[3/6] Installation des dépendances npm..."
npm install

# 5. Configurer .env s'il n'existe pas
if [ ! -f .env ]; then
  echo "[4/6] Création du fichier .env..."
  cat > .env << 'ENVFILE'
# ================================
# DISCORD BOT CONFIGURATION
# ================================
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
PREFIX=;
BOT_OWNERS=TON_ID_DISCORD_ICI

# ================================
# DASHBOARD CONFIGURATION
# ================================
SESSION_SECRET=change_this_to_a_random_secret_string
PORT=3000
DASHBOARD_PASSWORD=admin123
ENVFILE
  echo "   ⚠️  ÉDITE .env avec tes identifiants : nano .env"
  echo "   Puis relance : bash deploy.sh"
  exit 0
else
  echo "[4/6] .env déjà présent ✓"
fi

# 6. Lancer le bot avec PM2
echo "[5/6] Démarrage du bot..."
pm2 delete soulbot 2>/dev/null || true
pm2 start bot/index.js --name soulbot
pm2 save

# 7. Configurer le redémarrage automatique
echo "[6/6] Configuration du redémarrage auto..."
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  ✅ SOULBOT DÉPLOYÉ AVEC SUCCÈS      ║"
echo "╠══════════════════════════════════════╣"
echo "║  pm2 status      → voir l'état       ║"
echo "║  pm2 logs        → voir les logs     ║"
echo "║  pm2 restart     → redémarrer        ║"
echo "║  pm2 stop        → arrêter           ║"
echo "╚══════════════════════════════════════╝"
