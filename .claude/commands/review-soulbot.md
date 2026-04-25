# /review-soulbot — Audit Ultra Complet Soulbot

Effectue un audit EXHAUSTIF du code Soulbot selon les règles du CLAUDE.md.

## Agents mobilisés (polyphonie obligatoire)

🎙️ Orchestrateur · 🔍 Auditor · 🐛 Bug Triage · 🔐 SecOps
🏛️ Architecte · 🎨 Designer · 🤖 ENG1 · 🖥️ ENG2 · 🔧 ENG8
⚙️ ENG6 · 🎯 Lead Testeur · 🧭 CPO · ✍️ Copywriter · 🧘 Mentor

## Scope

Scanne tous les fichiers récemment modifiés dans :
- bot/core/
- bot/commands/
- bot/events/
- bot/ui/panels/
- bot/ui/handlers/
- bot/ui/modals/
- bot/scripts/

## Checklist 10 axes

1. **🔍 Doublons** : noms, aliases, fonctionnalités similaires
2. **🏛️ Architecture** : pattern customId, structure dossiers, séparation UI/logique
3. **🎨 UI cohérence** : accent 0xFF0000, ContainerBuilder, emojis via e()
4. **🔐 Sécurité** : permission checks, no eval, escape regex, SQL params
5. **🐛 Bugs** : try/catch, null checks, promises awaitées, memory leaks
6. **⚙️ DevOps** : schedulers logés, IF NOT EXISTS tables, INDEX présents
7. **🎯 Tests** : cas de test identifiés, edge cases
8. **🧭 UX** : flow panels, feedback utilisateur, messages erreur clairs
9. **✍️ Copy** : français impeccable, tone cohérent, pas de fautes
10. **🧘 Hygiène** : no console.log debug, no code mort, imports propres

## Format rapport

# 🔍 AUDIT SOULBOT — [Date]
## 📊 Score : X/100
## ✅ Points forts
## ⚠️ Avertissements
## 🔴 Problèmes critiques
## 🎯 Recommandations
## 📝 Fichiers audités
## 🚀 Plan d'action priorisé (3-5 actions)

## Règles
- NE PAS modifier le code, juste reporter
- Être EXHAUSTIF
- Prioriser : sécurité > bugs > architecture > style
