# 🗺️ Roadmap des Commandes Soulbot

**Dernière mise à jour** : 2026-04-18T00:00:00Z
**Source** : Inspiration bot de référence, logique 100% from scratch
**Total cible** : 233 commandes réparties sur 16 catégories (19 pages `;help`)

---

## 📊 Progression globale

- ✅ Créées et validées : 15 / 233 *(existantes Sprint 0, à valider Testeurs)*
- 🟡 En cours : 0
- ⏳ À créer : 218

**Commandes existantes importées du Discovery (27)** : voir ci-dessous dans leurs catégories respectives, cochées `[x]` si déjà validées par la Squad Testeurs.

---

## 🎯 Phases de production recommandées

**Phase 1 — Fondations Admin** (~39 cmd)
→ Owner (Part 1 + Part 2)

**Phase 2 — Modération** (~39 cmd)
→ Modération (Part 1 + Part 2)

**Phase 3 — Configuration & Protection** (~33 cmd)
→ Configuration + Protection

**Phase 4 — Information & Utile** (~45 cmd)
→ Information + Utile

**Phase 5 — Engagement & Système** (~76 cmd)
→ Statistique + Ticket + Fun + Game + Giveaway + Greeting + Invitation + Niveau + Rôle + Custom

---

## 📁 Catégorie 1 — Owner (40 commandes)

**Pages `;help`** : 14 et 15
**Priorité** : P1
**Accès** : Owner bot uniquement

- [ ] `alias` — Gérer des alias de commandes
- [ ] `antijoin <on/off>` — Configurer la possibilité d'ajouter le bot sur un serveur
- [ ] `autobackup` — Gérer les backups automatiques du serveur
- [ ] `backup` — Panel de gestion des backups
- [ ] `blacklist [@membre/id]` — Consulter la blacklist ou en ajouter
- [ ] `bot` — Modifier le profil du bot sur le serveur (Pseudo, Avatar)
- [ ] `cmdonly` — Définir les salons où seules les commandes du bot sont autorisées
- [ ] `competing <activité>` — Modifier l'activité du bot sur competing
- [ ] `delperm perm<numéro>` — Supprimer une permission
- [ ] `disable <commande>` — Désactiver une commande
- [ ] `duperm <permission> <commande>` — Dupliquer une commande à une permission spécifique sans la retirer de l'ancienne
- [ ] `footer [footer]` — Modifier les footers des embeds
- [ ] `listen <activité>` — Modifier l'activité du bot sur listen
- [ ] `manager [@membre/id]` — Consulter la liste des managers ou en ajouter
- [ ] `mp <@membre> <message>` — Envoyer un message à un membre
- [ ] `newperm perm<numéro>` — Créer une permission custom
- [ ] `perms` — Voir les permissions et les commandes
- [ ] `playing <activité>` — Modifier l'activité du bot sur playing
- [ ] `prefix <préfixe>` — Changer le préfixe utilisé par le bot
- [ ] `renewperms` — Rétablir la configuration des permissions par défaut
- [ ] `resetperms` — Désactiver toutes les commandes sauf les catégories owner/buyer
- [ ] `resetstatut` — Supprimer le statut du bot
- [ ] `say <texte>` — Faire parler le bot
- [ ] `serverlist` — Consulter la liste des serveurs du bot
- [ ] `setbanner <lien/pièce jointe>` — Modifier la bannière du bot
- [ ] `setname <nom>` — Modifier le nom du bot
- [ ] `setperm <permission> <@role/id/everyone>` — Configurer les permissions
- [ ] `setpic <lien/pièce jointe>` — Modifier l'avatar du bot
- [ ] `status` — Configurer le statut du bot
- [ ] `statutrotator` — Configurer le statut rotator
- [ ] `stream <activité>` — Modifier l'activité du bot sur stream
- [ ] `switch <permission> <commande>` — Réaffecter une commande à une permission spécifique
- [ ] `switchall <perm_source> <perm_destination>` — Déplacer toutes les commandes d'une permission source vers une destination
- [ ] `theme` — Panel de configuration du thème et des émojis
- [ ] `unblacklist <@membre/id/all>` — Supprimer une personne de la blacklist
- [ ] `unmanager [@membre/id]` — Supprimer un manager
- [ ] `unsetperm <permission> <@role/id/everyone>` — Supprimer une autorisation d'une permission
- [ ] `unwhitelist <@membre/id>` — Supprimer une personne de la whitelist (ou vider la whitelist si "all")
- [ ] `watch <activité>` — Modifier l'activité du bot sur watch
- [ ] `whitelist [@membre/id]` — Consulter la whitelist ou ajouter des membres

---

## 📁 Catégorie 2 — Modération (41 commandes)

**Pages `;help`** : 10 et 11
**Priorité** : P1
**Accès** : Modérateurs (permissions configurables)

- [x] `ban <@membre/id> [raison]` — Bannir un membre *(existante — à valider Squad Testeurs)*
- [x] `clear <nombre> [@membre]` — Supprimer un nombre spécifié de messages dans un salon *(existante — à valider Squad Testeurs)*
- [x] `kick <@membre/id>` — Expulser un membre du serveur *(existante — à valider Squad Testeurs)*
- [x] `mute <@membre> <durée>` — Mute un membre pendant une période *(existante — à valider Squad Testeurs)*
- [x] `unban <id> [raison]` — Débannir un membre *(existante — à valider Squad Testeurs)*
- [x] `warn <@membre/id> [raison]` — Avertir un membre *(existante — à valider Squad Testeurs)*
- [ ] `addrole <@membre/id> [<@rôle1/id1> <@rôle2/id2> ...]` — Ajouter un ou plusieurs rôles à un membre
- [ ] `clear bans [raison]` — Débannir tous les membres
- [ ] `clear mutes` — Retirer le mute de tous les membres
- [ ] `clear warns <@membre/id/all>` — Supprimer tous les avertissements d'un membre ou de tous
- [ ] `derank <@membre/id>` — Retirer tous les rôles d'un membre
- [ ] `emojiadd <:nom:> | <url> [nom]` — Ajouter des emojis personnalisés
- [ ] `emojidel emoji1 emoji2 ...` — Supprimer des emojis personnalisés
- [ ] `emojirename :emoji: nouveau_nom` — Renommer un emoji du serveur
- [ ] `find <@membre/id>` — Voir si un membre est en vocal
- [ ] `hide [#salon1] [#salon2] [...]` — Cacher un ou plusieurs salons
- [ ] `hideall` — Cacher tous les salons du serveur
- [ ] `infractions <@membre/id>` — Voir les avertissements d'un membre
- [ ] `lock [#salon1] [...]` — Verrouiller un ou plusieurs salons
- [ ] `lockall` — Verrouiller tous les salons du serveur
- [ ] `massrole` — Gérer les rôles en masse
- [ ] `nickname <membre/id> <pseudo>` — Renommer un membre
- [ ] `removerole <@membre/id> [<@rôle1/id1> ...]` — Retirer un ou plusieurs rôles à un membre
- [ ] `renew` — Renouveler un salon (supprimer et recréer)
- [ ] `slowmode <#salon/id>` — Définir le slowmode pour un salon
- [ ] `sticker [lien] [nom]` — Ajouter un sticker au serveur
- [ ] `sync <#salon/id>` — Synchroniser les permissions du salon avec sa catégorie
- [ ] `tempban <@membre/id> <durée> [raison]` — Bannir temporairement
- [ ] `tempmute <@membre> <durée>` — Mute temporaire
- [ ] `temprole <@membre/id> <durée> <@rôle/id> [raison]` — Attribuer temporairement un rôle
- [ ] `unhide [#salon1] [...]` — Rendre visible un ou plusieurs salons
- [ ] `unhideall` — Afficher tous les salons cachés
- [ ] `unlock [#salon1] [...]` — Déverrouiller un ou plusieurs salons
- [ ] `unlockall` — Déverrouiller tous les salons
- [ ] `unmute <@membre>` — Retirer le mute d'un membre
- [ ] `unslowmodeall` — Retirer le slowmode de tous les salons
- [ ] `unwarn <@membre/id> <identifiant>` — Supprimer un avertissement
- [ ] `vkick <@membre/id>` — Expulser un membre du salon vocal
- [ ] `vkickall <#salon/id>` — Déconnecter tous les membres d'un salon vocal
- [ ] `vmove <@membre/id>` — Déplacer un membre dans un salon vocal
- [ ] `vmoveall <#salon>` — Déplacer tous les membres d'un salon vers un autre

---

## 📁 Catégorie 3 — Configuration (19 commandes)

**Page `;help`** : 2
**Priorité** : P1
**Accès** : Administrateurs serveur

- [ ] `antileak` — Configure le système AntiLeak (token, IPv4, e-mail, numéro)
- [ ] `autoreact` — Configurer des réactions automatiques
- [ ] `autorole` — Configurer l'auto rôle (rôles aux membres qui rejoignent)
- [ ] `confdigi` — Configurer le système de digicode
- [ ] `configuration` — Voir la configuration du bot
- [ ] `confperms` — Afficher les permissions et les rôles associés
- [ ] `counter` — Configurer des salons counters
- [ ] `ghostping` — Gérer les salons pour les notifications de ghostping
- [ ] `logs` — Configurer les salons de logs
- [ ] `namerole` — Assigner un rôle selon pseudo contenant un élément
- [ ] `pfp` — Configure les salons pour les changements d'avatar et de bannière
- [ ] `publicserver` — Panel pour configurer un serveur FiveM/Minecraft
- [ ] `recurmsg` — Configurer des messages récurrents
- [ ] `sethelp` — Configurer le style du help
- [ ] `soutien` — Attribuer un rôle selon statut spécifique
- [ ] `suggestion` — Configurer le système de suggestions et envoyer le panel
- [ ] `tagrole` — Assigner un rôle selon tag serveur
- [ ] `tts` — Configurer les salons de TTS
- [ ] `voicemanager` — Configurer le voice manager

---

## 📁 Catégorie 4 — Protection (12 commandes)

**Page `;help`** : 3
**Priorité** : P1
**Accès** : Administrateurs serveur

- [ ] `antialt` — Configurer la protection anti-alt (comptes récents)
- [ ] `antiinvite <on/off>` — Activer ou désactiver la protection contre les invitations
- [ ] `antilink <on/off>` — Activer ou désactiver la protection contre les liens
- [ ] `antispam <on/off>` — Activer ou désactiver la protection contre les spams
- [ ] `badwords` — Afficher la liste des mots interdits
- [ ] `firewall` — Configurer les différents firewalls du serveur
- [ ] `invitechannel` — Définir les salons autorisés pour l'envoi d'invitation
- [ ] `linkchannel` — Définir les salons autorisés pour l'envoi de lien
- [ ] `piconly` — Définir les salons où seules les images sont autorisées
- [ ] `protect` — Configurer les protections
- [ ] `raidmode <on/off>` — Configurer une protection contre l'ajout de bot externe
- [ ] `secur <low/medium/max>` — Définir une sécurité sur le serveur

---

## 📁 Catégorie 5 — Information (25 commandes)

**Page `;help`** : 9
**Priorité** : P2
**Accès** : Public

- [ ] `adminlist` — Voir la liste des administrateurs du serveur
- [x] `avatar [@membre/id]` — Consulter l'avatar d'un utilisateur *(existante — à valider Squad Testeurs)*
- [ ] `bienvenue` — Souhaiter la bienvenue au membre le plus récent à avoir rejoint
- [ ] `boosters` — Voir la liste des boosters du serveur
- [ ] `botinfo` — Voir les informations sur le bot
- [ ] `bots` — Voir la liste des bots du serveur
- [ ] `channelinfo [#salon/id]` — Voir les informations d'un salon
- [ ] `emojiinfo <emoji>` — Afficher des informations sur un emoji personnalisé
- [ ] `fiveminfo <id>` — Afficher des informations sur un serveur FiveM
- [ ] `github [pseudo]` — Voir les informations sur un compte github
- [x] `help` — Consulter la page d'aide du bot *(existante — à valider Squad Testeurs)*
- [ ] `helpall` — Consulter la page d'aide entière du bot
- [ ] `invite` — Obtenir les liens d'invitation du bot
- [ ] `inviteinfo [code]` — Afficher les informations sur une invitation
- [ ] `mybots` — Voir ses bots
- [ ] `nicklist` — Voir la liste des membres qui se sont renommés
- [x] `ping` — Consulter la latence du bot ✅ *(validée Sprint 0)*
- [ ] `prevnames [@membre/id]` — Consulter les anciens pseudos
- [ ] `role [@membre]` — Consulter les rôles d'un membre
- [ ] `roleinfo` — Consulter les informations sur un rôle
- [ ] `searchuser <pseudo>` — Rechercher un membre par pseudo
- [x] `serverinfo [id]` — Consulter les informations d'un serveur *(existante — à valider Squad Testeurs)*
- [ ] `support` — Obtenir le lien du serveur support
- [x] `userinfo [@membre]` — Afficher les informations d'un membre *(existante — à valider Squad Testeurs)*
- [ ] `var` — Obtenir les informations sur les variables

---

## 📁 Catégorie 6 — Utile (21 commandes)

**Page `;help`** : 19
**Priorité** : P2
**Accès** : Public

- [ ] `afk` — Se mettre en afk
- [ ] `afklist` — Afficher la liste des utilisateurs AFK
- [ ] `calc` — Faire des calculs
- [ ] `digicode` — Entrer un digicode
- [ ] `edit` — Voir le dernier message modifié dans le salon
- [ ] `embed [#salon] [messageId]` — Constructeur d'embed
- [ ] `join` — Fait rejoindre le bot dans votre salon vocal
- [ ] `leave` — Fait quitter le salon vocal par le bot
- [ ] `myembeds` — Afficher la liste de vos embeds sauvegardés
- [ ] `password` — Générer un mot de passe personnalisable
- [ ] `qrcode <texte>` — Générer un QR code
- [ ] `reminders` — Afficher la liste de vos rappels actifs
- [ ] `remindme [temps] [message]` — Créer un rappel
- [ ] `search <commande>` — Rechercher une commande par similarité
- [ ] `shorturl <url>` — Raccourcir une URL
- [ ] `snipe` — Voir le dernier message supprimé dans le salon
- [ ] `suggest` — Créer une suggestion
- [ ] `timestamp` — Générer un timestamp
- [ ] `translate <texte>` — Traduire un texte
- [ ] `unafk` — Ne plus être en afk
- [ ] `voicepanel` — Configurer son salon vocal depuis un panel

---

## 📁 Catégorie 7 — Statistique (12 commandes)

**Page `;help`** : 17
**Priorité** : P2
**Accès** : Public

- [ ] `activity` — Tableau de bord d'activité combinée du serveur
- [ ] `channels` — Analyser l'activité des salons
- [ ] `compare @user1 [@user2 ...]` — Comparer les statistiques
- [ ] `heatmap` — Horaires de pic d'activité
- [ ] `leaderboard` — Classement d'activité
- [ ] `profil [@membre]` — Statistiques vocales et messages
- [ ] `pulse` — Pouls en direct du serveur
- [x] `stats` — Statistiques du serveur *(existante — à valider Squad Testeurs)*
- [ ] `stats greet` — Statistiques des visites
- [ ] `stats message` — Statistiques des messages
- [ ] `stats voice` — Statistiques vocales
- [ ] `vc` — Statistiques vocales du serveur

---

## 📁 Catégorie 8 — Ticket (12 commandes)

**Page `;help`** : 18
**Priorité** : P2
**Accès** : Staff tickets

- [ ] `add <@membre/id>` — Ajouter une personne dans le ticket
- [ ] `claim [#salon]` — Claim le ticket
- [ ] `close [#ticket]` — Fermer un ticket
- [ ] `closeall` — Fermer tous les tickets ouverts
- [ ] `delete [#ticket]` — Supprimer un ticket
- [ ] `deleteall` — Supprimer tous les tickets fermés
- [ ] `quickticket` — Configuration rapide du système de ticket
- [ ] `remove <@membre/id>` — Retirer une personne du ticket
- [ ] `rename <nom>` — Renommer un ticket
- [ ] `reopen [#ticket]` — Réouvrir un ticket
- [ ] `ticket` — Configurer le système de ticket
- [ ] `ticketload` — Configurer le panel de chargement de ticket

---

## 📁 Catégorie 9 — Fun (12 commandes)

**Page `;help`** : 5
**Priorité** : P3
**Accès** : Public

- [x] `8ball <question>` — Répondre par une multitude de choix *(existante — à valider Squad Testeurs)*
- [ ] `ascii <texte>` — Générer un art ascii
- [ ] `cat` — Afficher une photo aléatoire de chat
- [x] `flip` — Jouer à pile ou face *(existante : coinflip.js — à valider Squad Testeurs)*
- [ ] `gay [@membre]` — Générer une image avec un gay
- [ ] `hack <membre>` — Simuler le piratage d'un membre
- [ ] `joke` — Générer une blague
- [ ] `lovecalc [@membre1/nom/random/id] [@membre2/...]` — Pourcentage d'amour entre deux membres
- [ ] `note <args..>` — Noter votre argument /10
- [ ] `orientation [membre|random]` — Voir l'orientation sexuelle
- [ ] `qi [@membre]` — Calculer un quotient intellectuel
- [x] `roll <limite>` — Générer un nombre aléatoire entre 1 et la limite *(existante — à valider Squad Testeurs)*

---

## 📁 Catégorie 10 — Game (10 commandes)

<!-- Note : le bot de référence indiquait 11 — le comptage réel de la liste fournie donne 10. -->

**Page `;help`** : 6
**Priorité** : P3
**Accès** : Public

- [ ] `advancement [@membre]` — Statistiques et points des jeux
- [ ] `demineur` — Jouer au démineur
- [ ] `fasttype` — Voir votre vitesse au clavier
- [ ] `findemoji` — Jouer à un jeu de trouvaille
- [ ] `flood` — Jouer à flood
- [ ] `matchpairs` — Jeu de mémo
- [ ] `puissance4` — Jouer à puissance 4
- [ ] `rps <@membre>` — Jouer à chifumi
- [ ] `snake` — Jouer à snake
- [ ] `tictactoe` — Jouer à tic-tac-toe

---

## 📁 Catégorie 11 — Giveaway (5 commandes)

**Page `;help`** : 7
**Priorité** : P2
**Accès** : Modérateurs

- [ ] `gcreate <#salon> <temps> <gain>` — Créer un giveaway
- [ ] `gend <giveawayID>` — Terminer un giveaway en cours
- [ ] `giveaway` — Créer un giveaway
- [ ] `gparticipants <id>` — Consulter la liste des participants
- [ ] `reroll <id>` — Reroll un giveaway

---

## 📁 Catégorie 12 — Greeting (3 commandes)

**Page `;help`** : 8
**Priorité** : P2
**Accès** : Administrateurs serveur

- [ ] `greeting` — Configurer le système d'arrivée et de départ
- [ ] `joiner <#salon/off>` — Activer ou désactiver le système de bienvenue
- [ ] `leaver <#salon/off>` — Activer ou désactiver le système de départ

---

## 📁 Catégorie 13 — Invitation (5 commandes)

**Page `;help`** : 12
**Priorité** : P2
**Accès** : Public (sauf admin)

- [ ] `addinvites <@membre/id> <quantité>` — Ajouter des invitations bonus
- [ ] `invitereward` — Gérer le système de récompenses d'invitation
- [ ] `invites [@membre/id]` — Consulter ses invitations
- [ ] `leaderboard invite` — Voir le classement des inviteurs
- [ ] `removeinvites <@membre/id> <quantité>` — Retirer des invitations bonus

---

## 📁 Catégorie 14 — Niveau (6 commandes)

**Page `;help`** : 13
**Priorité** : P3
**Accès** : Public (sauf admin)

- [ ] `addlevel <@membre> <nombre>` — Ajouter du niveau
- [ ] `customrank` — Personnaliser la carte de niveau du serveur
- [ ] `leaderboard level` — Voir la liste des membres avec le plus de niveaux
- [ ] `level` — Gérer le système de niveaux
- [ ] `rank [@membre]` — Consulter son niveau
- [ ] `removelevel <@membre> <nombre>` — Retirer du niveau

---

## 📁 Catégorie 15 — Rôle (5 commandes)

**Page `;help`** : 16
**Priorité** : P2
**Accès** : Administrateurs serveur

- [ ] `reactinfo <messageID>` — Informations sur un réaction rôle
- [ ] `reactlist` — Lister tous les réaction rôles
- [ ] `roleload` — Configurer le panel de chargement des menus rôles
- [ ] `rolepanel` — Créer un panel de rôle
- [ ] `rradd` — Créer un réaction rôle

---

## 📁 Catégorie 16 — Custom (5 commandes)

**Page `;help`** : 4
**Priorité** : P3
**Accès** : Administrateurs serveur

- [ ] `clear customs` — Supprimer toutes les commandes custom
- [ ] `custom <commande>` — Créer une commande personnalisée
- [ ] `custominfo <nom>` — Informations sur une commande custom
- [ ] `customlist` — Liste des commandes custom
- [ ] `delcustom <nom>` — Supprimer une commande custom

---

## 🔄 Commandes existantes hors roadmap (à analyser)

Ces commandes sont codées dans le projet (Sprint 0) mais ne correspondent pas à une entrée directe de la roadmap.
Elles restent actives et seront analysées batch par batch.

| Commande | Fichier | Statut | Note |
|---|---|---|---|
| `warnings` | `moderation/warnings.js` | Actif | Remplacé par `infractions` dans la roadmap — à conserver tel quel ou fusionner |
| `compteur` | `stats/compteur.js` | Actif | Fonctionnalité non couverte par les 12 stats de la roadmap |
| `graph` | `stats/graph.js` | Actif | Proche de `channels` / `activity` — à évaluer |
| `inactif` | `stats/inactif.js` | Actif | Fonctionnalité non couverte — à conserver |
| `listbday` | `stats/listbday.js` | Actif | Hors roadmap — anniversaires, à évaluer |
| `poll` | `stats/poll.js` | Actif | Hors roadmap — sondage, à évaluer |
| `reset` | `stats/reset.js` | Actif | Hors roadmap — reset stats |
| `role` (stats) | `stats/role.js` | Actif | Conflit de nom potentiel avec `role` Information |
| `settings` | `stats/settings.js` | Actif | Hors roadmap — config stats |
| `star` | `stats/star.js` | Actif | Hors roadmap — starboard config |
| `starboard` | `stats/starboard.js` | Actif | Hors roadmap — starboard view |
| `statembed` | `stats/statembed.js` | Actif | Hors roadmap — embed stats |

---

## 📊 Récapitulatif par catégorie

| # | Catégorie | Réel | Priorité | Page help |
|---|---|---|---|---|
| 1 | Owner | 40 | P1 | 14-15 |
| 2 | Modération | 41 | P1 | 10-11 |
| 3 | Configuration | 19 | P1 | 2 |
| 4 | Protection | 12 | P1 | 3 |
| 5 | Information | 25 | P2 | 9 |
| 6 | Utile | 21 | P2 | 19 |
| 7 | Statistique | 12 | P2 | 17 |
| 8 | Ticket | 12 | P2 | 18 |
| 9 | Fun | 12 | P3 | 5 |
| 10 | Game | 10 | P3 | 6 |
| 11 | Giveaway | 5 | P2 | 7 |
| 12 | Greeting | 3 | P2 | 8 |
| 13 | Invitation | 5 | P2 | 12 |
| 14 | Niveau | 6 | P3 | 13 |
| 15 | Rôle | 5 | P2 | 16 |
| 16 | Custom | 5 | P3 | 4 |
| | **TOTAL** | **233** | | |

---

## 🔄 Process par batch

Pour chaque batch (10-15 cmd max) :

1. Nathan déclenche : "Lance le batch [catégorie] part [N]"
2. 🏛️ Architecte + 🤖 ENG1 + ✍️ Copywriter co-travaillent
3. Code généré à partir de `commands/_template.js`
4. Textes FR puisés dans ce fichier roadmap
5. 🔍 Auditor relit
6. 🎯 Squad Testeurs valide runtime
7. 📚 Documentation Writer coche les commandes livrées
8. 🎙️ Orchestrateur commit : `feat(commands): batch [catégorie] part [N] — [N] commandes`

---

## 🚫 Règles strictes

- Aucun code source du bot de référence ne doit être copié.
- Chaque commande est codée from scratch avec le template Soulbot.
- Les textes FR de ce fichier sont la source des descriptions.
- La logique métier est définie batch par batch avec Nathan si ambiguë.
- Le design final respecte `#F39C12`, `author iconURL`, charte ton Soulbot.

---

*Dernière mise à jour : 2026-04-18 · Sprint 0 validé · Roadmap v1.0*
