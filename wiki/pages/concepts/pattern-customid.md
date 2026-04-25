---
title: Pattern customId
type: concept
created: 2026-04-24
updated: 2026-04-24
tags: [concept, architecture, discord]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# Pattern customId

## Définition
Convention stricte de nommage pour les `customId` des boutons, 
modals et selectMenus Discord. Format : **`panel:section:action[:arg]`**. 
Permet un routage déterministe dans l'handler `interactionCreate`.

## Pourquoi c'est important (pour Soulbot)
- Routage prévisible : `split(':')` suffit à identifier l'action
- Scalabilité : 200+ commandes sans collision
- Debug : lire un customId = comprendre l'intention
- Convention partagée par tous les sub-agents

## Principes clés
- **4 segments max** : panel / section / action / arg optionnel
- Séparateur strict : `:` (jamais `-` ou `_`)
- Lowercase partout
- Arguments dynamiques en fin (ex : user ID)

## Exemples
```
security:feature:toggle:antilink
embed:section:edit:title
ticket:open:confirm
panel:welcomer:preview
role:assign:color:ff0000
```

## Comment on l'applique dans Soulbot
- CommandHandler filtre `interaction.customId` sur `split(':')[0]` 
  pour identifier le panel
- Chaque handler UI est dédié à un panel
- Règle enforce par [[sub-agent-architect]]

## Concepts liés
- [[concept-components-v2]]
- [[concept-pattern-storage-separation]]

## Entités associées
- [[sub-agent-architect]]
- [[sub-agent-eng2-ui]]
- [[pack-forteresse]] (utilise `security:*`)
- [[ticket-v2]] (utilise `ticket:*`)

## Questions ouvertes
- Besoin d'un 5e segment pour cas complexes ?
- Normaliser les args dynamiques (user ID format) ?

## Sources
- [[source-2026-04-23-24-session-initiale]]
