---
title: .gitleaks.toml
type: entity
created: 2026-04-24
updated: 2026-04-24
tags: [fichier, sécurité, ci-cd]
sources: [source-2026-04-23-24-session-initiale, source-toolbox-analysis]
status: active
confidence: high
---

# .gitleaks.toml

## Nature
Type : **fichier** — config détection de secrets

## Description
Fichier de configuration pour Gitleaks. Détecte les secrets/tokens 
avant commit : clés API, tokens Discord, webhooks, credentials Twitch.

## Caractéristiques
- Étend la config par défaut Gitleaks (`useDefault = true`)
- 3 règles custom :
  - `discord-bot-token` : `[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}`
  - `discord-webhook` : URLs `https://discord.com/api/webhooks/...`
  - `twitch-client-secret` : `twitch_client_secret="..."`
- Allowlist : `.backup-rollback/`, `.tmp-toolbox/`, `node_modules/`, 
  `.git/`

## Rôle dans Soulbot
Filet de sécurité anti-fuite de secrets. Appelé via 
`npm run security:secrets` localement et via GitHub Action 
(`.github/workflows/gitleaks.yml`) sur push/PR.

## Interactions / Relations
- Appelé par `bot/scripts/check-secrets.sh`
- Déclenché par `.github/workflows/gitleaks.yml`
- Intégré dans [[sub-agent-secops]] workflow

## État
Status : **en prod**

## ⚠️ Point d'attention
Le binaire gitleaks n'est PAS installé sur la machine de Nathan 
au 2026-04-24. Installation requise avant de lancer 
`npm run security:secrets`.

## Sources
- [[source-2026-04-23-24-session-initiale]]
- [[source-toolbox-analysis]]
