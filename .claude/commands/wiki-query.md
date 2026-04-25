# /wiki-query — Interroger le wiki pour répondre à une question

Workflow pour répondre à une question en utilisant le wiki Soulbot 
comme base de connaissance.

## Utilisation

Nathan pose une question. Claude Code répond en utilisant le wiki.

## Workflow

### Étape 1 : Lecture index
- Lire wiki/index.md pour identifier les pages potentiellement pertinentes
- Identifier 3-7 pages max à consulter

### Étape 2 : Lecture pages
- Lire les pages identifiées
- Suivre les liens [[...]] vers pages connexes si pertinent

### Étape 3 : Synthèse
- Synthétiser une réponse claire avec CITATIONS
- Format des citations : 
  > Voir [[page-X]] section "Y"

### Étape 4 : Proposition de page synthèse
Si la réponse est riche (> 200 mots) ou si c'est une analyse 
intéressante :
- Proposer à Nathan : "Veux-tu filer cette synthèse dans 
  wiki/pages/syntheses/{slug}.md ?"
- Si oui : créer la page + updater index + log

### Étape 5 : Identification de gaps
Si la réponse n'est pas complète faute d'info dans le wiki :
- Lister les gaps dans la réponse
- Proposer : "On peut ingérer une nouvelle source sur X pour combler 
  ce gap"

## Règles

- Toujours citer les pages wiki utilisées
- Jamais inventer une info qui n'est pas dans les sources
- Si incertain, dire "info non trouvée dans le wiki, proposition de 
  recherche / ingest"
