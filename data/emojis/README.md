# Emojis custom Soulbot

Ce dossier contient les PNG des emojis custom uploadés sur Discord via `;setupemojis`.

## Fichiers présents (13)

| Fichier | Rôle |
|---|---|
| ui_shield.png    | Protection / Sécurité |
| ui_save.png      | Enregistrer |
| ui_add_guild.png | Ajouter serveur |
| ui_search.png    | Rechercher / Variables |
| ui_mod.png       | Modérateur |
| ui_warning.png   | Avertissement |
| ui_check.png     | Valider |
| ui_cross.png     | Refuser |
| ui_plus.png      | Ajouter |
| ui_minus.png     | Retirer |
| ui_dev.png       | Développeur |
| ui_star.png      | Favori / Premium |
| ui_chat.png      | Chat / Message |

## Procédure d'upload

1. Crée un serveur Discord "Soulbot Emojis"
2. Invite le bot sur ce serveur
3. Rôle du bot → active **"Gérer les emojis et stickers"**
4. Tape `;setupemojis` dans ce serveur
5. Les IDs sont sauvegardés dans `data/emojis-ids.json`
6. `theme.js` les utilise automatiquement au prochain démarrage

> `data/emojis-ids.json` est gitignored (généré automatiquement).
