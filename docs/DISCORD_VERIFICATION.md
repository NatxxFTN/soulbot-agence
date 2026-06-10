# Discord Verification — Soulbot

## Prérequis (à faire dans le Discord Developer Portal)

### 1. Créer une Developer Team
1. Va sur https://discord.com/developers/teams
2. Crée une équipe (même si t'es solo)
3. Ajoute ton compte avec vérification email + 2FA activé
4. Transfère l'application Soulbot à cette équipe

### 2. Remplir les infos de l'application
Va dans https://discord.com/developers/applications/<ID>/information

| Champ | Valeur suggérée |
|-------|----------------|
| **Name** | Soulbot |
| **Description** | Bot Discord premium tout-en-un : modération, logs, tickets, giveaways, protections, et bien plus. 300+ commandes en français. |
| **Tags** | Modération, Utilitaires, Social, Fun |
| **Icon** | (ton logo existant) |
| **Terms of Service URL** | `https://<ton-domaine>/terms` |
| **Privacy Policy URL** | `https://<ton-domaine>/privacy` |

### 3. Configurer l'OAuth2
Si tu veux que le dashboard marche en ligne :
1. Ajoute l'URL de redirection : `https://<ton-domaine>/auth/callback`
2. Scopes : `identify`
3. Mets à jour `DASHBOARD_URL` dans `.env`

### 4. Vérifier le bot
- `bot_require_code_grant` : **désactivé**
- `integration_require_code_grant` : **désactivé**
- `public_bot` : **activé** si tu veux que d'autres invitent le bot

### 5. Paiement
- Configure tes versements dans le Developer Portal
- France/Belgique/Suisse sont éligibles

## Ce qu'on a déjà préparé

### ✅ Terminé
- [x] **Conditions d'Utilisation** → `website/terms.html` (accessible via `/terms`)
- [x] **Politique de Confidentialité** → `website/privacy.html` (accessible via `/privacy`)
- [x] **Routes Express** → `/terms` et `/privacy` servent les pages depuis le dashboard
- [x] **Renommage antinsfw → antiexplicit** (le mot "NSFW" peut trigger la review auto)
- [x] **Commandes propres** — aucun langage grossier dans les noms/descriptions

### 📝 Reste à faire (hors code)
- [ ] Créer une Developer Team sur https://discord.com/developers/teams
- [ ] Activer 2FA sur ton compte Discord
- [ ] Transférer l'app à la team
- [ ] Héberger les pages ToS/Privacy sur un domain public (ou utiliser GitHub Pages, Vercel, etc.)
- [ ] Remplir la description et les URLs dans le Developer Portal
- [ ] Soumettre à vérification

## Hébergement des pages légales

Si t'as pas de domaine, tu peux :
1. **Option GitHub Pages** : mets `terms.html` et `privacy.html` dans un repo GitHub, active GitHub Pages → tu reçois des URLs du genre `https://tonuser.github.io/repo/terms.html`
2. **Option Vercel/Netlify** : déploie le dossier `website/` gratuitement
3. **Option Dashboard** : si ton dashboard est en ligne, les routes `/terms` et `/privacy` sont déjà prêtes

## Contact pour support Discord
- Tu dois avoir un serveur de support (obligatoire pour la vérification)
- Ajoute le lien dans la description de l'application
