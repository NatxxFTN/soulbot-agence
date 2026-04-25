# /wiki-ingest — Ingérer une nouvelle source dans le wiki

Workflow pour intégrer une nouvelle source dans le wiki Soulbot selon 
les règles de wiki/SCHEMA.md.

## Utilisation

Nathan indique :
1. Le chemin de la source dans wiki/raw/ (ou demande à l'agent de la fetcher)
2. Le contexte rapide (pourquoi cette source est ajoutée)

## Workflow Claude Code

### Étape 1 : Lecture
- Lire wiki/SCHEMA.md pour rappel des conventions
- Lire la source intégralement

### Étape 2 : Discussion
- Résumer en 3-5 phrases les takeaways pour Nathan
- Demander à Nathan si des takeaways spécifiques sont à mettre en avant

### Étape 3 : Résumé de source
- Créer wiki/pages/syntheses/source-{slug}.md avec template source-summary.md
- Remplir les sections : takeaways, entités, concepts, décisions liées, citations, questions

### Étape 4 : Identification des updates
- Lister les entités et concepts mentionnés
- Pour chaque, check si page wiki existe :
  - Si oui → prévoir update
  - Si non → prévoir création

### Étape 5 : Cross-updates
- Pour chaque entity/concept identifié, updater sa page
- Ajouter les liens [[...]] bi-directionnels
- Enrichir sans dupliquer

### Étape 6 : Index & Log
- Ajouter la source dans wiki/index.md section "Sources ingérées"
- Ajouter les nouvelles pages dans leurs sections respectives
- Append dans wiki/log.md :
  `## [YYYY-MM-DD] ingest | Titre de la source`

### Étape 7 : Rapport Nathan
Résumer :
- Source ingérée : nom + localisation
- Pages créées : liste
- Pages mises à jour : liste
- Questions ouvertes identifiées (pour futures ingest ou recherche)

## Règles critiques

- JAMAIS modifier wiki/raw/ (immutable)
- Respecter SCHEMA.md strictement
- Si tu hésites, demande à Nathan avant de créer
- Signaler les contradictions avec les pages existantes
