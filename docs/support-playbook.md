# Support Playbook — Soulbot

> Procédures internes Squad Community & Support (CS1–CS4).
> Document vivant — mis à jour à chaque changement de process.

---

## Flux de ticket standard

```
Admin crée ticket
  → CS4 : accusé de réception < 10 min
  → CS4 : demande contexte (commande, erreur, ID serveur)
  → Classification (Bug / Setup / Premium / Feature request)
  → Bug ? → CS4 rédige Bug Report → Squad Principale
  → Setup ? → CS4 ou CS2 répond via FAQ ou guidage
  → Premium ? → CS1 impliqué (SLA prioritaire)
  → Feature ? → remonté au CPO via note
  → Admin confirme résolution → ticket fermé
  → CS3 vérifie si FAQ à créer (3+ occurrences)
```

## SLA par niveau

| Niveau | Accusé réception | Réponse utile | Résolution cible |
|---|---|---|---|
| Premium P1 (bug critique) | < 10 min | < 30 min | < 4h |
| Premium P2 (setup) | < 10 min | < 1h | < 8h |
| Free P3 (bug) | < 30 min | < 2h | < 24h |
| Free P4 (question) | < 1h | < 4h | < 48h |

## Réponses type

**Accusé de réception :**
> "On a bien reçu ton message. On regarde ça et on revient vers toi rapidement."

**Demande d'infos complémentaires :**
> "Pour t'aider, j'ai besoin de : l'ID de ton serveur, la commande utilisée, et si possible un screenshot du message d'erreur."

**Bug confirmé, fix en cours :**
> "Bug confirmé de notre côté. Fix en cours — on te tient au courant dès que c'est déployé."

**Fermeture ticket :**
> "Le souci est résolu. Si ça revient, n'hésite pas à rouvrir un ticket. Bonne continuation !"

## Escalation

| Situation | Action |
|---|---|
| Bug critique (bot offline, data loss) | CS1 notifie Nathan immédiatement |
| Admin agressif / hors sujet | CS2 warn public, CS1 décide suite |
| Demande remboursement | CS1 + CPO |
| Faille sécurité signalée | CS1 + SecOps + Nathan en DM privé |
