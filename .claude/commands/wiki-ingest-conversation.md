# /wiki-ingest-conversation — Ingérer une conversation Claude.ai

Transforme une conversation Claude.ai complète en pages wiki 
structurées de façon quasi-automatique.

## Utilisation

1. Dans Claude.ai, tu cliques sur les 3 points en haut à droite
2. Tu cliques "Copier la conversation" (ou similaire)
3. Tu colles dans un fichier .md dans wiki/raw/conversations/
4. Nomme le fichier selon le format : YYYY-MM-DD-sujet-principal.md
5. Dans Claude Code, tape : /wiki-ingest-conversation 
   wiki/raw/conversations/YYYY-MM-DD-sujet.md

## Workflow automatique

### Étape 1 : Lecture
- Lire la conversation entière
- Identifier la date, le sujet principal, les participants

### Étape 2 : Extraction structurée

Identifier et extraire :

**Décisions prises** → créer des pages dans wiki/pages/decisions/
- Format ADR
- Date = date conversation
- Contexte, décision, alternatives, conséquences

**Entités mentionnées** → créer/updater wiki/pages/entities/
- Fichiers, packs, commandes, sub-agents, systèmes

**Concepts abordés** → créer/updater wiki/pages/concepts/
- Définitions, principes, application

**Problèmes identifiés** → noter dans docs/BRAIN.md section "À résoudre"
- Bugs
- Questions ouvertes
- Dette technique

**Synthèses utiles** → créer dans wiki/pages/syntheses/
- Analyses, comparaisons, plans stratégiques

**Prompts majeurs utilisés** → créer dans wiki/pages/prompts-archives/
(créer ce dossier s'il n'existe pas)
- Nom du prompt
- Quand utilisé
- Résultat obtenu

### Étape 3 : Cross-référencement

- Créer les liens [[...]] bidirectionnels entre pages
- Linker avec pages existantes si pertinent

### Étape 4 : Index + Log

- Ajouter nouvelle source dans wiki/index.md section "Sources ingérées"
- Lister toutes les pages créées par cette ingestion
- Append dans wiki/log.md :
  ## [YYYY-MM-DD] ingest-conversation | Sujet principal

### Étape 5 : Rapport Nathan

Produire un rapport synthétique :

# 📥 Ingestion conversation : [Sujet]

## 📊 Stats
- Lignes dans la source : X
- Pages créées : Y
- Pages mises à jour : Z
- Durée estimée : W minutes

## 📜 Décisions identifiées
- [[decision-X]]
- [[decision-Y]]

## 🎭 Entités créées/enrichies
- [[entity-A]] (nouvelle)
- [[entity-B]] (enrichie)

## 💡 Concepts identifiés
- [[concept-X]] (nouveau)
- [[concept-Y]] (enrichi)

## ⚠️ Problèmes signalés
- Bug : [...]
- Question ouverte : [...]

## 📝 Prompts archivés
- [[prompt-pack-forteresse]] (si identifié)

## 🔗 Cross-links ajoutés
Total : X liens bidirectionnels

## 🎯 Suggestions
- Questions à poser pour approfondir : [...]
- Pages à créer qui manquent : [...]

## Règles critiques

- JAMAIS inventer du contenu non présent dans la conversation
- Citer la conversation source pour chaque page créée
- Respecter wiki/SCHEMA.md strictement
- Si la conversation est très longue (> 50k mots), proposer de la 
  découper en chapitres avant ingestion
- Ne pas dupliquer : vérifier l'existant avant de créer
