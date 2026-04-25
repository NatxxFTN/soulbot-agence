---
title: Components V2 exclusivement
type: decision
created: 2026-04-24
updated: 2026-04-24
tags: [decision, adr, ui]
sources: [source-2026-04-23-24-session-initiale]
status: active
confidence: high
---

# ADR: Components V2 Discord exclusivement

**Date** : 2026-04-24
**Décideurs** : Nathan (+ Claude Code)
**Status** : **active**

## Contexte
Discord.js v14.16+ introduit le framework **Components V2** 
(`ContainerBuilder`, `TextDisplayBuilder`, `SeparatorBuilder`). Les 
embeds classiques sont progressivement dépréciés.

## Décision
**Components V2 partout** dans Soulbot.
- Nouveaux panels : Components V2 obligatoire
- Anciens embeds : signaler + migrer progressivement
- Flag `MessageFlags.IsComponentsV2` à l'envoi obligatoire
- Accent color : `0xFF0000`

## Alternatives considérées

### Alt 1 : Garder embeds classiques
- Pros : code existant fonctionnel
- Cons : **deprecated par Discord**, identité fade, pas de 
  composition moderne
- **Rejeté** : on suit l'évolution Discord

### Alt 2 : Mix embeds + Components V2 selon cas
- Pros : pragmatique
- Cons : incohérence identité, maintenance double
- **Rejeté** : cohérence > pragmatisme tactique

## Conséquences

### Positives
- Identité Soulbot signature (rouge + Components V2)
- Préparation futur Discord (embeds deprecated)
- Composition riche (containers imbriqués, separators)

### Négatives / Trade-offs
- **Upgrade requis** : discord.js `^14.14.1` → `^14.16+`
- Migration progressive des embeds existants à faire
- Courbe d'apprentissage pour Nathan

### Action items découlant
- [ ] `npm install discord.js@^14.16.0`
- [ ] Audit panels existants encore en embeds classiques
- [ ] Migration progressive (pas d'un coup)

## Liens
- [[concept-components-v2]]
- [[fichier-design-md]]

## Sources
- [[source-2026-04-23-24-session-initiale]]
