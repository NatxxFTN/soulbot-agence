# Icônes de Rôles — ServerForge

Ce dossier contient les icônes PNG pour les rôles Discord générés par ServerForge.

---

## Prérequis

- Serveur Discord **boosté niveau 2 ou plus** (obligatoire pour les icônes de rôles)
- Compte **DiscoTools** (gratuit) : https://discotools.xyz/fr/icons-editor

---

## Générer tes icônes custom

1. Va sur **https://discotools.xyz/fr/icons-editor**
2. Connecte-toi avec Discord (gratuit) pour débloquer toutes les formes
3. Choisis une icône dans la bibliothèque
4. Applique la couleur du thème : **`#8B5CF6`** (violet électrique)
5. Télécharge en **PNG avec transparence**
6. Place le fichier dans ce dossier avec le bon nom

---

## Nommage obligatoire

| Fichier | Rôle associé | Emoji custom |
|---------|-------------|--------------|
| `fondateur.png` | Fondateur | `<:crown:...>` |
| `admin.png` | Admin | `<:bolt:...>` |
| `moderateur.png` | Modérateur | `<:hammer:...>` |
| `vip.png` | VIP | `<:gem:...>` |
| `membre.png` | Membre | `<:check:...>` |
| `bots.png` | BOTS | `<:bot:...>` |

> ⚠️ **Important :** le nom du fichier doit correspondre exactement au `icon_local` dans le template.

---

## Format recommandé

| Propriété | Valeur |
|-----------|--------|
| Taille | 64×64px minimum (128×128px recommandé) |
| Format | PNG avec canal alpha (transparence) |
| Fond | Transparent |
| Couleur | `#8B5CF6` (thème) ou couleur du rôle |

---

## Si le serveur n'est pas boosté niveau 2

Le bot **ignore** l'icône silencieusement et crée le rôle sans icône.
Aucune erreur n'est affichée à l'utilisateur.

---

## Documentation complète

Voir `SETUP-EMOJIS.md` à la racine du projet pour les instructions détaillées
de configuration des emojis custom.
