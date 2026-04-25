---
title: Roadmap présentation tuteur stage
type: synthesis
created: 2026-04-24
updated: 2026-04-24
tags: [synthesis, roadmap, stage]
sources: [source-2026-04-23-24-session-initiale]
status: draft
confidence: medium
---

# Roadmap présentation tuteur stage

## TL;DR
Objectif : impressionner le tuteur de stage avec un projet Soulbot 
qui dépasse le périmètre classique d'un stage dev web. Soulbot doit 
démontrer maîtrise technique + processus pro + réflexion produit.

## Contexte de la synthèse
Nathan est en stage et prépare sa présentation de projet. Soulbot 
est la pièce maîtresse.

## Analyse — 5 axes à mettre en avant

### 1. Bot fonctionnel complet
- Démo live : Pack Forteresse, Embed Builder, Custom Commands
- 132+ commandes de base + systèmes signatures
- Identité visuelle signature (rouge/noir, Components V2)

### 2. Landing page premium [À VALIDER NATHAN]
- Brief existant ? Si oui, où ?
- Design : Instrument Serif, glassmorphism rouge
- Doit démontrer design system cohérent

### 3. Documentation pro
- [[fichier-claude-md]] — règles projet Claude Code
- [[fichier-design-md]] — design system Google Labs
- [[fichier-agents-md]] — standard multi-agents
- `docs/` structuré (README, ARCHITECTURE, ROADMAP, CHANGELOG)

### 4. Processus pro
- Gitleaks CI (détection secrets auto)
- 13 slash commands custom (`/review-soulbot`, `/security-prelaunch`, 
  etc.)
- Squad polyphonique 14 agents
- Sub-agents Claude Code dans `.claude/agents/`

### 5. Mémoire projet (LLM Wiki)
- Pattern Karpathy implémenté
- 50+ pages wiki
- Graph view Obsidian
- Démonstration de réflexion méthodologique

## Conclusions
Soulbot a aujourd'hui assez de matière pour une présentation qui 
impressionne. Le challenge restant : **nettoyer les bugs critiques** 
et **finaliser 1-2 packs de commandes supplémentaires** pour la démo.

## Actions proposées
- [ ] Fix bugs critiques ([[pipeline-chantiers-en-cours]])
- [ ] Valider Admin Pack pour démo
- [ ] Préparer support de présentation (slides ?)
- [ ] Tests Obsidian graph view (déplacer `.obsidian/` à la racine)

## [À VALIDER NATHAN]
- Date de la présentation ?
- Durée impartie ?
- Tuteur attend-il quelque chose de spécifique ?
- Landing page prévue avant ou après présentation ?

## Pages liées
- [[etat-projet-avril-2026]]
- [[pipeline-chantiers-en-cours]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
