#!/bin/bash
# Check local pour détecter secrets avant commit
# Usage: ./bot/scripts/check-secrets.sh

if ! command -v gitleaks &> /dev/null; then
  echo "Gitleaks n'est pas installé."
  echo "Installation : https://github.com/gitleaks/gitleaks#installation"
  exit 1
fi

echo "🔍 Scan des secrets en cours..."
gitleaks detect --config .gitleaks.toml --verbose

if [ $? -eq 0 ]; then
  echo "✅ Aucun secret détecté. Safe to commit."
else
  echo "🚨 Secrets potentiels détectés. NE PAS COMMIT tant que non résolus."
  exit 1
fi
