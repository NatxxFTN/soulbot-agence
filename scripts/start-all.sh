#!/bin/bash

echo ""
echo "🍊 ════════════════════════════════════════"
echo "   SOULBOT — Bot + Dashboard"
echo "   ════════════════════════════════════════"
echo ""

node scripts/kill-bot.js

if [ -f .bot.lock ]; then
  echo "🗑️  Suppression .bot.lock..."
  rm -f .bot.lock
fi

if [ ! -f .env ]; then
  echo "❌ ERREUR : .env manquant !"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "📦 Installation dépendances..."
  npm install
fi

echo ""
echo "✅ Bot + Dashboard — démarrage..."
echo ""

npm run dev:all
