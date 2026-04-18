# Changelog

Toutes les modifications notables de Soulbot sont documentées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
Versionnage : [Semantic Versioning](https://semver.org/lang/fr/)

---

## [Unreleased]

### Ajouté
- Système de localisation FR (`locales/fr/`) : commandes, erreurs, embeds, onboarding
- Charte de ton Soulbot (`docs/tone-of-voice.md`)
- Notes business (`docs/business-notes.md`)
- Fichier CLAUDE.md racine — configuration agence 37 agents

---

## [1.0.0] - 2026-04-18

### Ajouté
- Architecture initiale du bot Discord (discord.js v14)
- CommandHandler v2 avec guards : guildOnly, ownerOnly, permissions, cooldowns
- Système d'embeds (`bot/utils/embeds.js`) avec palette couleurs Soulbot
- Base de données SQLite (`better-sqlite3`) — tables guild_settings, user_stats, user_channel_stats
- Dashboard Express + Socket.io
- Handlers : boutons, modals, selects

[Unreleased]: https://github.com/soulbot/discord-manager/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/soulbot/discord-manager/releases/tag/v1.0.0
