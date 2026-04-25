---
title: Pivot identité orange vers rouge
type: decision
created: 2026-04-24
updated: 2026-04-24
tags: [decision, adr, design]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# ADR: Pivot identité orange → rouge/noir

**Date** : 2026-04-24
**Décideurs** : Nathan (+ Claude Code)
**Status** : **active**

## Contexte
CLAUDE.md v1.4 documentait une identité visuelle "Agence Soulbot" 
avec couleur signature orange `#F39C12`, 45 agents, embeds classiques. 
Cette doc était **désynchronisée** avec l'état réel du code (rouge + 
noir) et avec le positionnement produit (fork samy/orange en cours de 
modernisation).

## Décision
Officialiser le pivot :
- Couleur signature : **`#FF0000` (rouge)**
- Couleur secondaire : **`#0A0A0A` (noir)**
- Framework UI : **Components V2 partout**
- Squad : **14 agents polyphoniques** (pas 45)
- Backup v1.4 : `.backup-rollback/2026-04-24/CLAUDE.md.old`

## Alternatives considérées

### Alt 1 : Garder l'identité orange
- Pros : cohérence avec l'historique v1.4
- Cons : rupture avec la réalité du code, confusion maintenance
- **Rejeté** : la doc doit suivre le code, pas l'inverse

### Alt 2 : Fusion orange + rouge (deux couleurs signatures)
- Pros : héritage préservé
- Cons : identité incohérente, impossible à défendre dans un 
  design system
- **Rejeté** : un bot premium a UNE couleur signature

## Conséquences

### Positives
- CLAUDE.md v2.0 cohérente avec le code
- DESIGN.md avec tokens rouges (voir [[fichier-design-md]])
- Identité claire et défendable
- Base pour landing page premium (Tuteur stage)

### Négatives / Trade-offs
- Perte du lore "Agence Soulbot" du v1.4
- Nécessité de refactoriser les embeds classiques restants → 
  Components V2 (chantier en cours)

### Action items découlant
- [x] CLAUDE.md v2.0 écrit
- [x] DESIGN.md créé en format Google Labs
- [ ] Migration progressive embeds classiques → Components V2
- [ ] Upgrade `discord.js` v14.14.1 → v14.16+ (requis pour 
  Components V2 complet)

## Liens
- [[fichier-claude-md]]
- [[fichier-design-md]]
- [[concept-identite-rouge-noir]]
- [[concept-components-v2]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
