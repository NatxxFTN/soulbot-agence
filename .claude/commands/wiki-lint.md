# /wiki-lint — Audit périodique du wiki

Santé-check complet du wiki Soulbot. À lancer toutes les 10-20 ingests 
ou quand Nathan le demande.

## Checklist d'audit

### 1. Contradictions
Parcours les pages et détecte :
- Claims qui se contredisent entre pages
- Dates/chiffres incohérents
- Décisions contradictoires

### 2. Stale claims
- Affirmations obsolètes par rapport aux sources récentes
- Pages avec `updated` > 1 mois et sources plus récentes disponibles

### 3. Orphan pages
- Pages sans inbound links (personne ne pointe vers elles)
- Candidates à fusion ou suppression

### 4. Missing pages
- Entités/concepts mentionnés dans > 3 pages mais pas de page dédiée
- Candidats à création

### 5. Missing cross-references
- Pages qui parlent d'une entité sans la linker [[...]]
- Opportunités de liens bidirectionnels

### 6. Data gaps
- Pages avec `status: draft` depuis longtemps
- Sections "À compléter" non remplies
- Questions ouvertes jamais répondues

### 7. Inconsistent tagging
- Tags redondants (ex: #design vs #UI vs #ui)
- Tags orphelins (utilisés 1 seule fois)

## Format du rapport

# 🔍 LINT WIKI — [Date]

## 📊 Stats générales
- Total pages : X
- Pages créées depuis dernier lint : Y
- Pages updated depuis dernier lint : Z

## ⚠️ Contradictions détectées
- [[page-A]] vs [[page-B]] : contradiction sur X
  Proposition : ...

## 📉 Stale claims
- [[page-X]] : claim "..." obsolète selon [[source-Y]]
  Proposition : update

## 👻 Orphan pages (N)
- [[page-orpheline-1]] : aucun link inbound
  Proposition : linker depuis [[page-Y]] ou supprimer

## 🕳️ Missing pages (N)
- Concept "X" mentionné dans 5 pages sans page dédiée
  Proposition : créer [[concept-X]]

## 🔗 Missing cross-refs (N)
- [[page-A]] mentionne "Y" sans [[y]]
  Proposition : ajouter lien

## ❓ Data gaps
- Question ouverte dans [[page-Z]] : "..."
  Proposition : ingérer source sur ce sujet

## 🏷️ Inconsistent tagging
- #design et #ui utilisés de façon similaire
  Proposition : unifier en #design

## 🎯 Plan d'action priorisé
1. Action 1
2. Action 2
3. Action 3

## Append dans log.md

Une entrée : `## [YYYY-MM-DD] lint | N issues détectées`
