# /emoji-check — Validation des emojis custom Soulbot

Audit exhaustif des emojis custom utilisés dans le code vs emojis-ids.json.

## Objectifs

1. Détecter les `e('nom_emoji')` qui n'existent PAS dans `data/emojis-ids.json`
2. Détecter les emojis dans emojis-ids.json qui ne sont JAMAIS utilisés
3. Vérifier que chaque emoji a son fallback Unicode
4. Lister les emojis custom hardcodés (`<:nom:123>`) au lieu d'utiliser `e()`

## Actions

1. Lire `data/emojis-ids.json`
2. `grep -rn "e(" bot/` pour extraire tous les appels e('xxx')
3. Comparer les 2 listes
4. Produire un rapport :

# 🎨 AUDIT EMOJIS SOULBOT

## ❌ Emojis manquants dans emojis-ids.json
Liste des `e('xxx')` qui vont fallback sur Unicode.
Par fichier:ligne.

## ⚠️ Emojis orphelins (inutilisés)
Liste des emojis dans JSON mais jamais appelés via e().

## 🚫 Emojis hardcodés (à refactor)
Liste des `<:xxx:123>` trouvés dans le code — à remplacer par e('xxx').

## 📊 Stats
- Total emojis dans JSON : X
- Total appels e() : Y
- Coverage : Y/X × 100 = Z%
- Emojis manquants : N
- Emojis orphelins : M

## 🚀 Actions recommandées
1. Upload manquants : liste commande `npm run emojis:upload`
2. Supprimer orphelins : liste pour cleanup JSON
3. Refactor hardcodés : liste fichiers à patcher

## Règles
- NE PAS modifier le code, juste reporter
- Ignorer les commentaires (emojis dans les // ne comptent pas)
