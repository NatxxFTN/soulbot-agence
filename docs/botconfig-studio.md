# Studio /botconfig — V5 + V6 « Total Control »

> Dernière mise à jour : 12 juin 2026 — commits `9864f18` (V5) et `e456d32` (V6)
> Statut : **implémenté, 78/78 tests offline, en attente de validation Discord par Nathan**

Le Studio transforme `;botconfig` en centre de personnalisation totale du bot :
identité par serveur, thème hérité par toutes les commandes, profil global,
presets, historique avec rollback, aperçu live. **Zéro write DB tant que
« Appliquer » n'est pas cliqué.**

---

## Accès

| Commande | Résultat |
|---|---|
| `;botconfig` | Ouvre le Studio (onglet Identité) |
| `;botconfig legacy` | Ancien panel 3 onglets (rétrocompat) |
| `;botconfig prefix/nickname/pricing/reset` | Raccourcis texte historiques, inchangés |

Permission : **Gérer le serveur**. Certaines zones sont **BotOwner only**
(avatar global, profil global, tarifs).

---

## Les 7 onglets

### 1. Identité (par serveur)
Nickname, bannière, prefix, avatar global (BotOwner, rate-limit 2/h).
Galeries `↺` pour restaurer d'anciennes bannières/avatars.

### 2. Profil Bot (GLOBAL — BotOwner) `V6`
S'applique sur **tous** les serveurs :
- **Bio** « À propos de moi » (400 car. max)
- **Bannière de profil** du bot (rate-limit 2/h)
- **Username global** (rate-limit 2/h, validation anti-`@#:discord`)
- **Présence** : statut (En ligne/Inactif/DND/Invisible) + type d'activité
  (Joue à/Regarde/Écoute/En compétition/Streame/Custom) + texte libre +
  URL de stream (Twitch/YouTube, type Streame)
- La présence est **persistée dans `bot_profile`** et restaurée au démarrage
  par `ready.js` → survit aux restarts.

### 3. Thème (par serveur)
Hérité par TOUTES les commandes via `themed(guildId)` :
- 4 presets : Magenta / Cyber / Mono / Or (primaire + accent d'un clic)
- 3 styles d'embed : `compact` (sans description) / `rich` (footer + timestamp) / `minimal` (sans footer)
- **Couleurs sémantiques** `V6` : succès, erreur, warning, info — chacune
  personnalisable (null = charte Soulbot)
- **Emojis sémantiques** `V6` : remplace les emojis succès/erreur/warning/info
  de Soulbot par les emojis custom du serveur
- Footer custom (texte + icône), emoji de marque
- Tout passe par UN select 14 options (limite Discord : 40 composants/message)

### 4. Tarifs (BotOwner)
CRUD complet des plans : édition prix/description/position/défaut/actif,
création (slug auto), désactivation **soft** (jamais de DELETE — les achats
y réfèrent). Tri par `display_order` puis prix.

### 5. Presets
Snapshots complets (identité + thème + tarifs + prefix), max 10 par serveur.
Save / Charger (→ remplit le draft, pas la DB) / Dupliquer / Supprimer.
Les champs V6 sont inclus automatiquement (le payload suit `FIELD_VALIDATORS`).

### 6. Historique
Audit trail complet (`bot_config_log`) : qui a changé quoi, quand,
ancienne → nouvelle valeur. **Rollback granulaire 1-clic** (la valeur part
dans le draft). Les changements de profil global apparaissent préfixés
`profile:` — rollback réservé BotOwner.

### 7. Aperçu
Rendu live du thème **avant** application. Astuce technique : un message
Components V2 ne peut pas porter d'embed → l'aperçu est un 2ᵉ
`ContainerBuilder` dont l'`accentColor` = couleur du draft (même barre
latérale qu'un embed). Affiche aussi les 4 types sémantiques avec les
overrides d'emojis.

---

## Architecture

```
bot/
├── commands/configuration/botconfig.js     ← entrée (;botconfig → Studio)
├── ui/
│   ├── panels/botconfig-studio.js          ← rendu PUR (aucun write)
│   └── handlers/botconfig-studio-handler.js ← draft state + apply
├── core/
│   ├── guild-config.js                     ← identité par serveur + presets + historique
│   ├── bot-profile.js                      ← profil GLOBAL (bio/bannière/présence)  V6
│   └── pricing.js                          ← tarifs centralisés
├── utils/
│   ├── config-validators.js                ← SecOps : toute entrée validée ici
│   └── response-builder.js                 ← themed(guildId), cache 60s
└── events/ready.js                         ← restore présence + registration handlers
```

### Protocole customId
- Composants : `botconfig:studio:<action>[:param]`
- Modals : `botconfig_modal:studio:<champ>` et `botconfig_modal:studio:profile:<champ>` `V6`

### Draft state (le principe sacré)
- Draft en mémoire : `Map` clé `${guildId}:${userId}`, TTL 15 min, sweep lazy
- Structure : `{ fields: {...}, profile: {...}, prefix, tab, ts }`
- **Aucune écriture DB avant « Appliquer »** — galeries, rollbacks et
  chargements de presets remplissent aussi le draft
- Apply = ordre strict :
  1. Guards (BotOwner, rate-limits) — champs refusés retirés du draft + warning
  2. **Side effects Discord d'abord** (setNickname, setAvatar, setUsername,
     setBanner, application.edit) — un refus Discord n'écrit JAMAIS d'état
     fantôme en DB
  3. Transaction `applyIdentityDraft` (better-sqlite3) — identité serveur
  4. Transaction `applyProfileDraft` — profil global `V6`
  5. `setPresence` (lit la DB à jour) `V6`
  6. Prefix (`guild_settings`)
  7. `invalidateTheme(guildId)` + clear draft

### Héritage du thème — `themed(guildId)`
```js
const T = require('../utils/response-builder').themed(guild.id);
T.successEmbed('Fait', '…')   // couleur + emoji succès DU SERVEUR
T.errorEmbed('Oups', '…')     // idem erreur
T.primaryEmbed('Titre', '…')  // couleur primaire du serveur
```
Cache 60 s par guild + invalidation explicite à l'apply. L'API historique
(`successEmbed` & co sans guildId) reste inchangée — migration progressive.

---

## Schéma DB

### `guild_bot_config` (1 ligne par serveur — 21 colonnes)
V1 : `guild_id`, `nickname`, `banner_url`, `embed_color`, `updated_at`, `updated_by`
V5 : `accent_color`, `theme_name`, `avatar_url`, `footer_text`,
`footer_icon_url`, `embed_style`, `brand_emoji_id`
V6 : `color_success`, `color_error`, `color_warning`, `color_info`,
`emoji_success_id`, `emoji_error_id`, `emoji_warning_id`, `emoji_info_id`

### `bot_profile` (singleton id=1 — global) `V6`
`bio`, `banner_url`, `presence_status`, `presence_type`, `presence_text`,
`presence_url`, `updated_at`, `updated_by`

### Tables V5
- `bot_presets` — snapshots JSON, UNIQUE(guild_id, name), max 10
- `bot_assets_history` — FIFO 20 par type (avatar/banner/color)
- `bot_config_log` — audit trail (rollback), champs profil préfixés `profile:`
- `bot_pricing` + `is_default`, `display_order`

Toutes les migrations sont **idempotentes** (ALTER dans try/catch,
CREATE IF NOT EXISTS) — pattern maison de `bot/database/index.js`.

---

## SecOps

| Entrée | Règle |
|---|---|
| Couleurs | hex strict `#?[0-9A-Fa-f]{6}`, normalisé MAJ sans `#` |
| URLs images | **https only** + extension `.png/.jpg/.jpeg/.gif/.webp` + max 2048 car. — `data:`/`blob:`/`javascript:` rejetés par construction |
| URL stream | https + `twitch.tv`/`youtube.com` uniquement |
| Bio | 400 car. max (limite Discord) |
| Texte présence | 128 car. max |
| Username | 2-32 car., refuse `@ # : \`\`\`` et « discord » |
| Emojis | ID 17-20 digits ou mention `<a?:nom:id>` — Unicode rejeté |
| Noms de colonnes | **allowlists** `IDENTITY_FIELDS` / `PROFILE_FIELDS` — jamais un nom de colonne issu d'un customId |
| Rate-limits | avatar 2/h, username 2/h, bannière profil 2/h (fenêtres glissantes en mémoire) |
| Permissions | panel = Gérer le serveur · avatar/profil/tarifs = BotOwner |

---

## Tests

`node scripts/test-botconfig-v5.js` — **78 checks offline, zéro appel Discord** :
validateurs (34), draft/audit/FIFO (9), presets (9), pricing (7), thème (7),
profil global V6 (12). Nettoyage automatique des données de test.

## Validation Discord à faire (checklist Nathan)

- [ ] `;botconfig` → Studio s'ouvre, navigation 7 onglets
- [ ] Profil Bot → statut DND + texte d'activité → Appliquer → statut change en live
- [ ] Restart du bot → la présence revient toute seule
- [ ] Thème → Emoji succès custom → Appliquer → une commande quelconque l'utilise
- [ ] Thème → preset Cyber → Aperçu (barre cyan) → Appliquer
- [ ] Historique → rollback d'une entrée → re-Appliquer
- [ ] Presets → save → modifier → charger → Appliquer

## Rollback d'urgence

```bash
git checkout backup-pre-botconfig-v6        # tag avant V6
# DB : ../backups/bot-pre-botconfig-v6-20260612.db
git checkout backup-pre-botconfig-v5        # tag avant V5
# DB : ../backups/bot-pre-botconfig-v5-20260611-235044.db
```

## Limites connues / pistes V7

- **Avatar par serveur : impossible côté Discord** pour les bots (feature
  Nitro utilisateur) — l'avatar reste global, la bannière + thème font
  l'identité par serveur
- L'onglet Tarifs « Réordonner » affiche l'ordre en texte (pas de drag & drop)
- Galeries limitées aux types avatar/banner/color
- Migration progressive des 240+ commandes vers `themed(guildId)` à mener
