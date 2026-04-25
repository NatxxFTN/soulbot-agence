# 📐 Schéma du Wiki Soulbot

Ce document décrit comment le wiki Soulbot est structuré et comment 
Claude Code doit le maintenir. Il est la source de vérité pour les 
conventions.

## Philosophie

Le wiki Soulbot est un artefact vivant qui accumule et synthétise 
la connaissance sur le projet Soulbot (bot Discord premium français).

**Principe** : au lieu de re-dériver les connaissances à chaque 
question, Claude Code maintient un wiki persistant qui se compound 
au fil du temps.

**Division du travail** :
- Nathan : source des idées, curation, questions stratégiques
- Claude Code : rédaction, cross-référencement, synthèse, maintenance

## Structure

### wiki/raw/
Sources immutables. Claude Code y accède en lecture seule.
- conversations/ : transcripts Claude.ai (format .md)
- articles/ : articles web clippés (format .md via Obsidian Web Clipper)
- docs/ : PDFs, notes, transcriptions
- assets/ : images référencées dans les pages

### wiki/pages/
Pages wiki générées et maintenues par Claude Code.

**concepts/** : concepts abstraits du domaine
- components-v2.md
- pack-forteresse.md
- polyphonie-14-agents.md
- identite-rouge-noir.md
- etc.

**entities/** : choses nommées spécifiques
- sub-agent-mentor.md
- commande-security.md
- pack-admin.md
- fichier-design-md.md
- etc.

**decisions/** : Architecture Decision Records (ADR)
- 2026-04-24-pivot-rouge.md
- 2026-04-24-adoption-design-md.md
- etc.

**syntheses/** : synthèses thématiques transversales
- etat-projet-avril-2026.md
- roadmap-presentation-tuteur.md
- comparaison-crowbot-soulbot.md
- etc.

**comparisons/** : comparaisons entre options
- components-v2-vs-embeds.md
- obsidian-vs-notion.md
- ultrareview-vs-review.md
- etc.

## Conventions

### Nommage fichiers
- kebab-case : `pack-forteresse.md`, `sub-agent-mentor.md`
- Pas d'accents : `identite-rouge-noir.md` (pas identité)
- Dates ISO pour ADR : `2026-04-24-pivot-rouge.md`

### Frontmatter YAML obligatoire
Chaque page doit avoir :

```yaml
---
title: Titre de la page
type: concept | entity | decision | synthesis | comparison | source
created: 2026-04-24
updated: 2026-04-24
tags: [tag1, tag2]
sources: [source-id-1, source-id-2]
status: draft | active | superseded
confidence: low | medium | high
---
```

### Liens internes (format Obsidian)
- Liens simples : `[[components-v2]]`
- Liens avec alias : `[[components-v2|Components V2]]`
- Liens vers section : `[[components-v2#Architecture]]`

### Sources
Chaque claim factuel dans une page doit citer ses sources en bas :

```markdown
## Sources
- [[source-conversation-2026-04-23]] — section "Pack Forteresse"
- [[source-toolbox-analysis]] — outils identifiés
- [[source-discord-js-docs]] — ContainerBuilder API
```

### Tags recommandés
- #concept, #entity, #decision, #synthesis
- #design, #architecture, #security, #ux
- #sub-agent, #commande, #pack, #fichier
- #priorité-haute, #bloquant, #nice-to-have
- #draft, #validé, #en-révision

## Opérations

### INGEST — Ajouter une nouvelle source

Quand Nathan ajoute une source dans wiki/raw/ et dit "ingère cette source" :

1. **Lire** la source intégralement
2. **Discuter** les takeaways clés avec Nathan (2-3 lignes)
3. **Créer** une page résumé dans wiki/pages/syntheses/ avec format 
   source-summary.md (voir template)
4. **Identifier** les entités et concepts mentionnés
5. **Mettre à jour** les pages concernées dans wiki/pages/ :
   - Entities : ajouter les nouvelles infos dans les pages existantes
   - Concepts : enrichir les définitions
   - Decisions : si la source révèle une décision, créer/updater ADR
6. **Ajouter les cross-references** [[...]] partout où pertinent
7. **Updater** wiki/index.md (ajouter la nouvelle page)
8. **Appender** une entrée dans wiki/log.md (format ISO + type + titre)
9. **Rapporter** à Nathan : pages créées/modifiées + takeaways

Objectif : une source peut toucher 5-15 pages du wiki.

### QUERY — Répondre à une question

Quand Nathan pose une question :

1. **Lire** wiki/index.md pour identifier les pages potentiellement pertinentes
2. **Lire** les pages identifiées (pas toutes les sources raw !)
3. **Synthétiser** une réponse avec CITATIONS des pages utilisées
4. **Proposer** : "Veux-tu que je file cette synthèse comme nouvelle 
   page dans wiki/pages/syntheses/ ?" (si la réponse est riche)
5. Si oui : créer la page synthèse + updater index + log

Objectif : les explorations de Nathan enrichissent le wiki, elles ne 
se perdent pas dans l'historique chat.

### SAVE — Sauvegarder la dernière réponse

Quand Nathan tape `/wiki-save` ou `/save` après une réponse Claude 
intéressante :

1. **Identifier** la dernière réponse substantielle à sauvegarder
2. **Proposer** un titre, slug, et type (synthesis/comparison/decision)
3. **Valider** avec Nathan avant création
4. **Créer** la page dans le bon sous-dossier avec template approprié
5. **Extraire** les cross-links vers concepts/entities existants
6. **Updater** index.md + log.md
7. **Updater** les pages liées (cross-links bidirectionnels)
8. **Rapporter** à Nathan

Objectif : les explorations intéressantes compound dans le wiki au 
lieu de disparaître dans l'historique chat.

### LINT — Audit périodique du wiki

Quand Nathan dit "lint le wiki" ou automatiquement après 20 ingests :

1. **Contradictions** : claims qui se contredisent entre pages
2. **Stale claims** : affirmations obsolètes par rapport à sources 
   récentes
3. **Orphan pages** : pages sans inbound links
4. **Missing pages** : concepts mentionnés fréquemment mais sans 
   page dédiée
5. **Missing cross-references** : opportunités de liens manquées
6. **Data gaps** : questions importantes non documentées (proposer 
   recherche web)
7. **Inconsistent tagging** : tags redondants ou incohérents

Rapporter dans wiki/log.md section "lint" + proposer un plan d'action 
priorisé.

## Règles anti-dégradation

### Ne pas écrire de la fiction
Claude Code ne doit jamais inventer. Si une info manque, créer une 
page avec `status: draft` et une section "À compléter" listant les 
questions ouvertes.

### Ne pas duplicater
Avant de créer une page, grep le wiki. Si page similaire existe, 
enrichir au lieu de doubler.

### Citer systématiquement
Chaque claim factuel DOIT pointer vers au moins une source raw/.
Sans source, marquer avec `[TO CITE]`.

### Respecter l'immuabilité de raw/
Ne jamais modifier wiki/raw/. Lecture seule.

### Conserver l'historique
Ne jamais supprimer de page wiki. Si obsolete, passer en 
`status: superseded` et ajouter un lien vers la page remplaçante.
