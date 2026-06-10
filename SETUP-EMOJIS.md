# 🎨 Setup des Emojis Custom — ServerForge

> **Règle absolue :** Aucun emoji Unicode dans les noms de rôles, salons ou catégories.
> ServerForge utilise UNIQUEMENT des emojis custom uploadés sur le serveur Discord.

---

## Avant de lancer `/generate`, suis ces étapes :

### Étape 1 — Créer tes icônes

1. Va sur **https://discotools.xyz/fr/icons-editor**
2. Connecte-toi avec Discord (gratuit) pour débloquer toutes les formes
3. Pour CHAQUE icône dans la liste ci-dessous :
   - Choisis l'icône dans la bibliothèque
   - Applique la couleur du thème : **`#8B5CF6`** (ou ta couleur personnalisée)
   - Télécharge en PNG avec fond transparent

### Icônes à créer (minimum)

| Emoji | Nom | Usage |
|-------|-----|-------|
| `crown` | Couronne | Rôle Fondateur |
| `bolt` | Éclair | Rôle Admin |
| `hammer` | Marteau | Rôle Modérateur |
| `gem` | Diamant | Rôle VIP |
| `check` | Checkmark | Rôle Membre |
| `bot` | Robot | Rôle BOTS |
| `bell` | Cloche | Catégorie Important |
| `chat` | Bulle | Catégorie Général |
| `stats` | Statistiques | Catégorie Logs |
| `announce` | Mégaphone | Salon annonces |
| `rules` | Livre | Salon règlement |
| `welcome` | Main | Salon bienvenue |
| `music` | Note | Salon musique |
| `media` | Appareil photo | Salon médias |
| `log_join` | Entrée/Sortie | Log arrives/départs |
| `log_edit` | Crayon | Log messages |
| `log_mod` | Gavel | Log modération |
| `log_settings` | Engrenage | Log serveur |
| `log_voice` | Micro | Log vocal |

### Étape 2 — Uploader sur Discord

1. Paramètres du serveur → **Emojis** → **Ajouter un emoji**
2. Upload chaque PNG
3. Donne-lui un nom court (ex: `crown`, `bolt`, `hammer`...)
4. **Copie l'ID** : clic droit sur l'emoji → "Copier l'identifiant"

### Étape 3 — Remplir `bot/config/emojis.js`

Ouvre le fichier et remplace chaque `REMPLACE_PAR_ID` par le vrai ID Discord.

**Avant :**
```js
CROWN: '<:crown:REMPLACE_PAR_ID>',
```

**Après :**
```js
CROWN: '<:crown:123456789012345678>',
```

### Étape 4 — Lancer la génération

Une fois `emojis.js` rempli :

```bash
node deploy-commands.js
node bot/index.js
```

Puis dans Discord : **`/generate`**

---

## Format des noms

Le bot utilise les placeholders `{{NOM}}` dans le template.

**Exemple dans `default.template.json` :**
```json
{
  "name": "{{CROWN}} Fondateur"
}
```

Ces placeholders seront automatiquement remplacés par les vrais emojis custom au moment de la génération.

---

## Dépannage

**Les icônes de rôles ne s'affichent pas ?**
→ Discord exige un serveur **boosté niveau 2** pour les icônes de rôles.
→ Le bot ignore l'icône silencieusement si le serveur n'est pas boosté.

**Les emojis ne s'affichent pas ?**
→ Vérifie que l'emoji est uploadé sur le **même serveur** que la génération.
→ Vérifie que l'ID dans `emojis.js` est correct.

**Je veux changer la couleur des icônes :**
→ Modifie `bot/config/theme.js` → `THEME.COLOR_PRIMARY`
→ Recrée les icônes sur DiscoTools avec la nouvelle couleur
→ Ré-upload les icônes sur Discord
