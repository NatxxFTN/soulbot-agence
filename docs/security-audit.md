# Audit Sécurité Soulbot v2.1.2 — 2026-06-10

## Verdict global

L'architecture Forteresse (dispatcher central → détecteurs → punitions) est **saine et
fonctionnelle**. Deux modules étaient **100 % décoratifs** : leurs commandes écrivaient
une config que **personne ne lisait**. Corrigé ce jour.

## Modules détectés

| Module | Type | Enforcement | Statut |
|---|---|---|---|
| antilink | détecteur message | securityListener | ✔ testé |
| antiinvite | détecteur message | securityListener | ✔ testé |
| antieveryone | détecteur message | securityListener | ✔ testé (+ fix chaînage optionnel) |
| antimention | détecteur message | securityListener | ✔ testé |
| anticaps | détecteur message | securityListener | ✔ testé |
| antiwords | détecteur message | securityListener | ✔ testé |
| antiduplicate | détecteur message | securityListener | ✔ testé |
| antiemojispam | détecteur message | securityListener | ✔ testé |
| antiexplicit / antinsfw | détecteur message | securityListener | ✔ chargé |
| antibot | détecteur join | securityMemberListener | ✔ testé |
| antiraid | détecteur join | securityMemberListener | ✔ testé |
| antinewaccount | détecteur join | securityMemberListener | ✔ testé |
| raidmode | helper | guildMemberAdd | ✔ câblé |
| lockdown | commande + scheduler | 3packs-schedulers | ✔ câblé |
| **antispam** | config + panel | **AUCUN** | ❌ → ✔ RÉPARÉ |
| **antileak** | config + panel | **AUCUN** | ❌ → ✔ RÉPARÉ |
| ;whitelist / ;blacklist | commandes | security-storage | ✔ roundtrip testé |
| ;securitylogs | commande | security_logs | ✔ roundtrip testé |
| ;security panel | commande | security_config | ✔ (storage testé) |

## Bugs trouvés et corrigés

### BUG-1 (CRITIQUE) — antispam jamais appliqué
`;antispam` + son panel écrivaient `antispam_config` / `antispam_whitelist`, mais
**aucun listener ne lisait ces tables**. `antispam-helper.js` n'était requis que par
son propre panel. Un serveur qui « activait » l'antispam n'était pas protégé.
**Fix :** `bot/events/antispamEnforcer.js` — enforce flood, mention spam, messages
répétés, caps. Sanctions `none|delete|warn|timeout|kick|ban`, whitelist rôles
respectée, modérateurs (ManageMessages) exemptés, log dans `security_logs`.

### BUG-2 (CRITIQUE) — antileak jamais appliqué
Même problème : `antileak_config` écrite par `;antileak`, lue par personne.
**Fix :** `bot/events/antileakEnforcer.js` — détecte tokens Discord, IPs publiques
(privées/localhost ignorées), emails, téléphones. Sanction par type de fuite.

### BUG-3 (MINEUR) — antieveryone chaînage optionnel
`message.member?.permissions.has(...)` → durci en `permissions?.has(...)`.

## Tests

`node scripts/test-security.js` — **28/28 passés** (hors ligne, mocks, zéro appel
Discord). Couvre : 10 détecteurs message, 3 détecteurs join, les 2 nouveaux
enforcers (9 scénarios), et le roundtrip storage (config/whitelist/blacklist/logs).

## Reste à valider sur Discord (manuel)

1. Activer `;antispam` puis spammer 5 messages en 5 s avec un compte non-modo → timeout 10 min + log.
2. Activer `;antileak` puis poster un email → message supprimé + log.
3. `;securitylogs antispam` → les entrées apparaissent.
