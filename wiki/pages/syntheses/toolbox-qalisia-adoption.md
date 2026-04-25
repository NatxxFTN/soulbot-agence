---
title: Adoption de la Toolbox Qalisia
type: synthesis
created: 2026-04-24
updated: 2026-04-24
tags: [synthesis, toolbox, outils]
sources: [source-toolbox-analysis]
status: active
confidence: high
---

# Adoption de la Toolbox Qalisia

## TL;DR
La Toolbox Qalisia v7.2 expose **216 outils** + **17 kits** pour 
agents IA. Soulbot a adopté 3 pépites focus sécurité/productivité, 
et volontairement skippé les outils hors-scope.

## Contexte de la synthèse
Analyse effectuée le 2026-04-24 via curl `consult.md` + `tools.json` 
(pas de scraping nécessaire — contrat ai-instructions explicite).

## Analyse

### Adoptés (mise en prod)
1. **Gitleaks** — détection secrets en pre-commit + CI GitHub Action
   - Config custom : Discord bot token, webhooks, Twitch secret
   - Intégration : `npm run security:secrets`
2. **Kit security-prelaunch** — slash command `/security-prelaunch` 
   (audit 10 axes)
3. **Pattern LLM Wiki (Karpathy)** — second cerveau Soulbot 
   (inspiration croisée BenBktech)

### Évalués mais différés
- **MCP Sentinel** — utile avant d'installer d'autres MCP (pas 
  nécessaire pour l'instant)
- **Graphify** — -71x tokens via knowledge graph repo (pertinent 
  pour futur onboarding)
- **claude-mem** — mémoire persistante SQLite+Chroma (trop lourd 
  pour le besoin actuel)

### Skippés (hors scope)
- Pôle marketing/SEO/scraping (~75 outils) — pas le core Soulbot
- Supabase / Clerk — pas d'auth web nécessaire
- BMAD Method — Soulbot a déjà sa squad 14 agents
- Shannon / OWASP ZAP / Snyk / Trivy — overkill pour bot Discord 
  pré-prod

## Conclusions
La Toolbox est une **excellente base de veille** mais il faut 
**filtrer agressivement** selon le scope projet. Sur 216 outils, 
~5 sont réellement pertinents pour Soulbot.

## Actions proposées
- [ ] Re-consulter la Toolbox trimestriellement (via curl tools.json)
- [ ] Installer Gitleaks binaire localement

## Pages liées
- [[fichier-gitleaks-toml]]
- [[concept-llm-wiki-karpathy]]
- [[sub-agent-secops]]

## Sources
- [[source-toolbox-analysis]]
