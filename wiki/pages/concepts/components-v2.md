---
title: Components V2
type: concept
created: 2026-04-24
updated: 2026-04-24
tags: [concept, ui, discord]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Components V2

## Définition
Framework moderne de composition UI introduit par discord.js 14.16+ 
qui remplace progressivement les embeds classiques par des containers 
imbriqués enrichis (`ContainerBuilder`, `TextDisplayBuilder`, 
`SeparatorBuilder`).

## Pourquoi c'est important (pour Soulbot)
- **Différenciation visuelle** : panels modernes vs embeds fades
- **Composition riche** : containers imbriqués, séparateurs
- **Préparation futur** : les embeds sont dépréciés par Discord
- **Cohérence identité** : accent color applicable partout

## Principes clés
- `ContainerBuilder` = conteneur avec accent color
- `TextDisplayBuilder` = bloc de texte formaté
- `SeparatorBuilder` = séparateur visuel (remplace les lignes `═`)
- Flag `MessageFlags.IsComponentsV2` OBLIGATOIRE à l'envoi

## Comment on l'applique dans Soulbot
- Accent color : `0xFF0000` partout (rouge signature)
- Tous les nouveaux panels utilisent Components V2
- Les panels existants en embeds classiques sont signalés → migration 
  progressive

## Concepts liés
- [[concept-identite-rouge-noir]]
- [[concept-pattern-customid]]

## Entités associées
- [[ticket-v2]]
- [[pack-forteresse]]
- [[embed-builder-premium]]
- [[sub-agent-designer]]
- [[sub-agent-eng2-ui]]

## Questions ouvertes
- Migration des embeds classiques existants — plan détaillé ?
- Benchmark perf Components V2 vs embeds ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
- [[2026-04-24-components-v2-vs-embeds]]
