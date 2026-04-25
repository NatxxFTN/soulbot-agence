# /context-snapshot — Snapshot du contexte projet

Crée/met à jour un snapshot du contexte projet pour aider Claude Code 
à reprendre un projet sans perdre le contexte.

## Mission

Produire un fichier .claude/context-snapshot.md qui contient :

### 1. État actuel du projet
- Version Soulbot (selon package.json)
- Date du snapshot
- Dernier gros chantier terminé

### 2. Pipeline en cours
- Chantiers validés et déployés
- Chantiers en cours (prompts prêts mais pas collés)
- Chantiers en attente de test

### 3. Architecture actuelle
- Nombre de commandes total
- Nombre de tables SQL
- Nombre de schedulers actifs
- Nombre d'events listeners
- Taille base de données

### 4. Décisions récentes importantes
- Pivots d'identité (ex: orange → rouge)
- Choix techniques majeurs
- Abandons de features

### 5. TODO critiques
- Fix à appliquer d'urgence
- Tests manquants
- Refactor prioritaires

### 6. Ne JAMAIS oublier
- Règles absolues du projet
- Refus absolus (;dmall, nuke, etc.)
- Identité visuelle (rouge #FF0000)

## Workflow

1. Scanner l'état du projet :
   - git log --oneline -20 pour les commits récents
   - Compter les fichiers dans bot/commands/
   - Compter les tables SQL (grep CREATE TABLE)
   - Lire package.json pour la version

2. Récupérer le pipeline depuis la mémoire/historique Claude si possible

3. Produire le snapshot en format Markdown structuré

4. Sauvegarder dans .claude/context-snapshot.md

5. Mettre à jour la ligne suivante dans CLAUDE.md :
   "Dernier snapshot contexte : .claude/context-snapshot.md (date)"

## Utilisation

À lancer :
- Fin d'une grosse session
- Avant de fermer ton terminal pour la journée
- Quand tu sens que tu perds le fil
- Au début d'une nouvelle session pour re-synchroniser
