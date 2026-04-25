# /deploy-check — Vérifications pré-restart Soulbot

Check exhaustif AVANT `npm run restart:win` pour éviter les crashes.

## Checklist

1. **Syntaxe JavaScript**
   - Lance `node --check` sur chaque fichier modifié récemment
   - Identifie erreurs de syntaxe avant qu'elles crashent le bot

2. **Imports/Requires**
   - Vérifie que tous les `require()` pointent vers des fichiers existants
   - Détecte les imports circulaires

3. **Schemas SQL**
   - Scan les `CREATE TABLE` : vérifie IF NOT EXISTS
   - Scan les INSERT : vérifie que les colonnes existent dans le schéma

4. **Variables .env**
   - Liste les `process.env.XXX` utilisés dans le code
   - Compare avec .env.example ou .env
   - Alerte si des variables sont utilisées sans être documentées

5. **Handlers routing**
   - Vérifie que chaque `customId` commence par un préfixe routé dans interactionCreate
   - Détecte les handlers orphelins ou customIds non-routés

6. **Events listeners**
   - Détecte les events enregistrés MULTIPLE fois (risque de double-exécution)
   - Vérifie que chaque event est enregistré au bon endroit

7. **Dépendances package.json**
   - Vérifie que tous les `require()` ont leur package correspondant
   - Détecte les packages installés mais jamais utilisés

## Rapport final

# 🚦 DEPLOY CHECK SOULBOT

## 🟢 Prêt au restart
Tout est OK.

## 🟡 Avertissements (non-bloquants)
- ...

## 🔴 Bloquants (FIX AVANT restart)
- ...

## 📊 Résumé
- Fichiers scannés : X
- Problèmes trouvés : Y
- Décision : GO / NO-GO
