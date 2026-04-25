## Core Conventions

### UI Framework
- **Components V2 obligatoire** (ContainerBuilder + TextDisplayBuilder + 
  SeparatorBuilder)
- Accent color : `0xFF0000` (rouge signature Soulbot)
- Flag `MessageFlags.IsComponentsV2` à l'envoi
- Emojis via `e('nom')` avec fallback Unicode

### CustomId Pattern
Format strict : `panel:section:action[:arg]`

Exemples :
- `security:feature:toggle:antilink`
- `embed:section:edit:title`
- `ticket:open:confirm`

### Permissions (3-tier system)
- **BotOwner** : toutes perms (ENV `BOT_OWNER_IDS`)
- **Buyer** : peut ajouter des Owners
- **Owner** : utilise le bot
- Whitelist totale (users non-listés refusés sauf `;help` `;ping`)

## Code Style

- JavaScript vanilla (pas de TypeScript)
- Pas de frameworks UI externes (pur discord.js)
- Try/catch systématique pour les I/O
- SQL queries paramétrées (jamais de concaténation)
- Pas de `eval()` ou équivalents

## Testing

Il n'y a pas de suite de tests automatisée pour l'instant. Tests manuels :
1. Lancer `npm run restart:win`
2. Vérifier les 50 dernières lignes de logs (aucune erreur)
3. Tester les commandes impactées dans Discord
4. Vérifier les schedulers actifs (bump, temprole, etc.)

## Security Boundaries

### ✅ Always
- Respecter hiérarchie Discord (bot > target, author > target)
- Paramétrer les SQL queries
- Valider les inputs utilisateur (regex, length check)
- Rate limit via batching + délais (si bulk operations)
- Check permissions AVANT action (ManageGuild, BanMembers, etc.)

### ❌ Never touch
- Fichier `.env` (secrets, tokens)
- `data/database.sqlite` sans backup préalable
- Code sans mettre à jour `.backup-rollback/<timestamp>/`

### 🛑 Absolute refusals
- `;dmall` (DM de masse à tous les membres)
- `;kickall` / nuke membres (destruction communautaire)
- Toute feature violant les ToS Discord

## Workflow Protocol

### Before any code change
1. Lire CLAUDE.md et respecter la squad polyphonique
2. Scanner `bot/commands/` pour éviter les doublons (PHASE 0 obligatoire)
3. Sauvegarder dans `.backup-rollback/<timestamp>/` avant modifs

### After changes
1. Produire un rapport structuré (voir CLAUDE.md pour format)
2. STOP et laisser Nathan tester
3. Ne PAS enchaîner sur autre chose sans validation

## Git Conventions

- Branches : `feature/nom`, `fix/nom`, `refactor/nom`
- Commits : format `feat: description`, `fix: description`, `refactor: description`
- Ne JAMAIS commit sans avoir testé que le bot démarre

## Repository

https://github.com/NatxxFTN/soulbot-agence.git
