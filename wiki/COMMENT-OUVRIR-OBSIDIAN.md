# 📘 Comment ouvrir ton vault Obsidian Soulbot

## Étapes pour Nathan

### 1. Fermer Obsidian complètement
Quitte l'application (pas juste la fenêtre).

### 2. Relancer Obsidian

### 3. Dans la fenêtre d'accueil
- Cherche le bouton **"Open folder as vault"** (ou "Ouvrir le dossier comme vault")
- Clique dessus

### 4. Navigation
- Navigue jusqu'au dossier où se trouve `CLAUDE.md`
- Sélectionne CE dossier (celui qui contient `wiki/`, `.claude/`, `CLAUDE.md`, etc.)
- Clique **"Sélectionner le dossier"**

### 5. Premier démarrage
- Obsidian demande si tu fais confiance à l'auteur → OUI
- Obsidian demande si tu actives les snippets CSS → OUI
- Va dans Settings → Appearance → CSS snippets → Active `soulbot-identity`

### 6. Ce que tu dois voir
- Sidebar gauche : tous les dossiers du projet (bot/, wiki/, docs/, etc.)
- Page d'accueil : `wiki/HOME.md` qui s'ouvre automatiquement
- Couleurs : noir/rouge Soulbot ✨

### 7. Graph View
- Ctrl+G → tu vois ~52 nœuds connectés
- Les décisions sont en rouge, concepts en orange, entités en jaune

## Problèmes courants

### "Je ne vois qu'un fichier Sans titre"
→ Tu as ouvert le mauvais dossier. Reviens à l'étape 4 et sélectionne 
le BON dossier (celui qui contient CLAUDE.md).

### "Mes couleurs ne sont pas rouges"
→ Settings → Appearance → CSS snippets → Active `soulbot-identity`

### "Le graph view est vide"
→ Vérifie que Obsidian voit bien les fichiers (sidebar gauche). Si 
oui, actualise le graph (icône refresh en haut du graph).
