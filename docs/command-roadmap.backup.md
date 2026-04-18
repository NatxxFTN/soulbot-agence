# Roadmap commandes Soulbot — Objectif 250

> Chaîne de production activée 2026-04-18.
> Template : `bot/commands/_template.js`
> Pattern : 1 fichier = 1 commande. `name` + `execute` à la racine.

---

## État actuel

| Catégorie     | Dossier      | Existantes | Objectif | À créer |
|---------------|--------------|-----------|---------|---------|
| Owner         | owner        | 0         | 15      | 15      |
| Modération    | moderation   | 7 ✅       | 20      | 13      |
| Information   | public       | 0         | 15      | 15      |
| Utile         | utility      | 4 (hors help) | 20 | 16      |
| Configuration | gestion      | 0         | 25      | 25      |
| Protection    | —            | 0         | 20      | 20      |
| Fun           | fun          | 3         | 20      | 17      |
| Statistique   | stats        | 12        | 20      | 8       |
| Ticket        | —            | 0         | 20      | 20      |
| Niveaux       | levels       | 0         | 20      | 20      |
| Invitations   | invitations  | 0         | 15      | 15      |
| Game          | —            | 0         | 15      | 15      |
| Custom        | —            | 0         | 10      | 10      |
| **TOTAL**     |              | **26**    | **235** | **209** |

---

## Commandes par catégorie (cibles)

### 👑 Owner (15)
eval, reload, shutdown, status, servers, leaveserver, blacklist, unblacklist,
maintenance, announce, guildinfo-owner, botinvite, stats-owner, setpremium, revokepremium

### 🛡️ Modération (20) — 7 existantes
ban ✅ kick ✅ warn ✅ warnings ✅ clear ✅ mute ✅ unban ✅
→ À créer : unmute, lock, unlock, slowmode, addrole, removerole, nick,
  deafen, undeafen, move, massrole, tempban

### 📢 Information (15)
serverinfo, userinfo, roleinfo, channelinfo, botinfo, avatar, banner,
emoji, membercount, boosters, invites, permissions, timestamp, snowflake, uptime

### 🔧 Utile (20) — 4 existantes (avatar, ping, serverinfo, userinfo)
help ✅ avatar ✅ ping ✅ serverinfo ✅ userinfo ✅
→ À créer : calculator, translate, weather, qrcode, shortlink, remind,
  poll, color, base64, hash, timestamp, afk, notes, todo, steal-emoji,
  urban, wiki

### ⚙️ Configuration (25)
prefix, logs, autorole, autoreact, antiflood, antileak, antilink, antispam,
ghostping, counter, pfp, suggestion, ticket-setup, tts, voicemanager,
namerole, tagrole, soutien, confperms, recurmsg, publicserver, confdigi,
sethelp, configuration, blacklist-words

### 🔒 Protection (20)
antiflood, antispam, antilink, antileak, antiraid, whitelist, blacklist-ip,
lockdown, audit, captcha, alt-detector, vpn-detector, dupename,
word-filter, link-filter, mention-spam, newaccount, joingate, autoban, shield

### 🎮 Fun (20) — 3 existantes
8ball ✅ coinflip ✅ roll ✅
→ À créer : rps, hangman, trivia, akinator, meme, dadjoke, compliment,
  insult, ship, rate, choose, reverse, mock, uwuify, ascii, slots, dice,
  number-guess

### 📊 Statistique (20) — 12 existantes
→ Existantes : compteur, graph, inactif, listbday, poll, reset, role,
  settings, star, starboard, statembed, stats
→ À créer : leaderboard, voicetime, serveractivity, weeklyreport,
  topchannels, bday, activity, streaktop

### 🎫 Ticket (20)
ticket-open, ticket-close, ticket-add, ticket-remove, ticket-rename,
ticket-transcript, ticket-claim, ticket-unclaim, ticket-move, ticket-reopen,
ticket-list, ticket-config, ticket-category, ticket-ping, ticket-autoclose,
ticket-rating, ticket-archive, ticket-stats, ticket-panel, ticket-tag

### ⬆️ Niveaux (20)
rank, leaderboard, xp-add, xp-remove, xp-set, xp-reset, level-roles,
level-config, level-card, level-bg, level-channel, level-multiplier,
level-ignore, xp-transfer, level-prestige, level-reset-server,
level-import, level-export, level-notify, level-style

### 📨 Invitations (15)
invites, inviteleaderboard, invite-track, invite-config, inviteinfo,
invite-reset, invite-fake, invite-bonus, invite-remove, invite-add,
invite-channel, invite-message, invite-ranks, invite-code, invite-stats

### 🎲 Game (15)
tictactoe, blackjack, roulette, wordchain, quiz, scramble, typing-race,
memory, snake, minesweeper, connect4, truth-or-dare, would-you-rather,
never-have-i, story

### 🎨 Custom (10)
embed-builder, button-builder, menu-builder, reaction-role, auto-response,
custom-command, custom-event, custom-message, custom-embed, custom-role-menu

---

## Convention de production

1. Copier `_template.js` dans la catégorie cible
2. Renommer le fichier = nom de la commande
3. Remplir les TODO
4. Tester : `;nom_commande` en DM ou canal test
5. Valider visuellement : embed orange `#F39C12`, footer correct
6. Commit : `feat(commands): add [nom]`

## Priorité de livraison

| Sprint | Catégories | Commandes | Raison |
|--------|-----------|-----------|--------|
| S1     | Owner + Protection | ~35 | Fonctions critiques bot |
| S2     | Configuration | ~25 | Setup serveurs utilisateurs |
| S3     | Ticket + Niveaux | ~40 | Features premium core |
| S4     | Fun + Game | ~35 | Engagement + rétention |
| S5     | Invitations + Custom | ~25 | Growth + différenciation |
| S6     | Finish & polish | reste | Complétion 250 |
