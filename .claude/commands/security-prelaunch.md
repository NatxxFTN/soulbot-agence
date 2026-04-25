# /security-prelaunch — Audit sécurité complet avant mise en prod

Audit EXHAUSTIF de sécurité Soulbot avant de lancer le bot en prod 
réelle (serveurs utilisateurs).

## Sub-agent à mobiliser
Utilise le sub-agent secops en priorité + auditor + bug-triage.

## Checklist (10 axes)

### 1. 🔐 Secrets & Tokens
- [ ] .env n'est PAS dans Git (vérifier .gitignore)
- [ ] Pas de token hardcodé dans bot/
- [ ] Lancer gitleaks : npm run security:secrets
- [ ] .env.example est à jour et documenté

### 2. 🛡️ Permissions Discord
- [ ] Toutes les commandes mod vérifient member.permissions
- [ ] Hiérarchie respectée : bot > target, author > target
- [ ] Pas d'action possible sur l'owner du serveur
- [ ] Permissions bot Discord Developer Portal minimales

### 3. 🧪 Validation Inputs
- [ ] Tous les args utilisateur validés (length, type, regex)
- [ ] Regex avec escapeRegex pour contenus users
- [ ] Pas de eval() ou Function() dynamique
- [ ] Modals avec min/max length

### 4. 💾 Database
- [ ] SQL queries 100% paramétrées
- [ ] Pas de SELECT * sur grandes tables
- [ ] INDEX sur colonnes filtrées
- [ ] Backup auto configuré (data/database.sqlite)

### 5. 🚦 Rate Limiting
- [ ] Commandes bulk avec batching + délais
- [ ] Anti-spam en place
- [ ] Cooldown sur commandes coûteuses

### 6. 📝 Logs
- [ ] Logs d'actions sensibles (ban, kick, mute)
- [ ] Pas de leak d'IDs/tokens dans les logs
- [ ] Rotation logs (max 7 jours)

### 7. 🚫 Refus absolus
- [ ] ;dmall refusé
- [ ] Nuke cascade impossible
- [ ] Pas d'actions violant ToS Discord

### 8. 🚨 Error Handling
- [ ] Try/catch sur toutes les I/O
- [ ] Messages d'erreur génériques pour users (pas de stack)
- [ ] Logs internes détaillés

### 9. 🔄 Graceful Shutdown
- [ ] Schedulers cleanés au shutdown
- [ ] DB fermée proprement
- [ ] Pas de process.exit() brutal sauf urgence

### 10. 🌐 Dépendances
- [ ] npm audit (vulnérabilités connues)
- [ ] Dépendances à jour (npm outdated)
- [ ] Pas de package abandonné

## Format du rapport

# 🔐 AUDIT SÉCURITÉ PRÉ-LAUNCH — [Date]

## 🚦 Verdict global : GO / NO-GO

## ✅ Points forts
Liste.

## ⚠️ Warnings (non-bloquants)
Liste avec fichier:ligne.

## 🔴 BLOQUANTS (FIX avant prod)
Liste avec fichier:ligne + fix suggéré.

## 📊 Score : X/100
Calcul : 10 axes × 10 points.

## 🎯 Plan d'action
3-5 actions priorisées.

## Règles
- NE PAS modifier le code, juste reporter
- Prioriser BLOQUANT > Warning
- Si un bloquant est trouvé, verdict = NO-GO
