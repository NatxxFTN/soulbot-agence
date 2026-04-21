#!/bin/bash

echo ""
echo "🍊 ════════════════════════════════════════"
echo "   SOULBOT — Démarrage bot"
echo "   ════════════════════════════════════════"
echo ""

# Kill instances bot existantes (ciblé, pas pkill global)
node scripts/kill-bot.js

# Supprimer lock
if [ -f .bot.lock ]; then
  echo "🗑️  Suppression .bot.lock..."
  rm -f .bot.lock
fi

# Vérifier .env
if [ ! -f .env ]; then
  echo "❌ ERREUR : .env manquant !"
  exit 1
fi

# Vérifier node_modules
if [ ! -d node_modules ]; then
  echo "📦 Installation dépendances..."
  npm install
fi

echo ""
echo "✅ Environnement prêt"
echo "   Node   : $(node -v)"
echo ""
echo "🚀 Lancement du bot..."
echo ""

npm run dev:bot
