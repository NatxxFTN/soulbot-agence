# Processus de création des commandes Soulbot

> Document de référence pour la chaîne de production.
> Source principale : `docs/command-roadmap.md`

---

## Convention de création (résumé)

1. Copier `bot/commands/_template.js` dans le bon dossier catégorie
2. Renommer le fichier = nom exact de la commande (ex: `ban.js`)
3. Remplir tous les champs `TODO_` dans le template
4. Règles obligatoires :
   - `'use strict'` en tête de fichier
   - `module.exports` avec `name` + `execute` à la racine (jamais multi-export)
   - Utiliser `E.error()`, `E.success()`, `E.base()` de `../../utils/embeds`
   - Déclarer `guildOnly`, `permissions`, `cooldown` selon le contexte
5. Tester localement : `;nom_commande` dans un canal test
6. Vérifier visuel : embed orange `#F39C12`, footer `Page X/Y · Version X.X.X`
7. Commit : `feat(commands/catégorie): add nom_commande`

## Catégories et dossiers

| Catégorie (;help) | Dossier | Statut |
|---|---|---|
| Owner | `bot/commands/owner/` | 🔴 vide |
| Modération | `bot/commands/moderation/` | 🟢 7 commandes |
| Information | `bot/commands/public/` | 🔴 vide |
| Utile | `bot/commands/utility/` | 🟡 5 commandes |
| Configuration | `bot/commands/gestion/` | 🔴 vide |
| Fun | `bot/commands/fun/` | 🟡 3 commandes |
| Statistique | `bot/commands/stats/` | 🟡 12 commandes |
| Niveaux | `bot/commands/levels/` | 🔴 vide |
| Invitations | `bot/commands/invitations/` | 🔴 vide |

## Référence roadmap complète

→ Voir `docs/command-roadmap.md` pour la liste exhaustive des 235 commandes
planifiées par catégorie et la priorité de livraison S1→S6.

---

*Process Soulbot · v1.0 · 2026-04-18*
