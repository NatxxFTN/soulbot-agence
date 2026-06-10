# Audit Soulbot v2.1.2 — 2026-06-10

> Généré par scan automatique de `bot/commands/` (249 fichiers).
> Critères : emojis Unicode natifs, réponses éphémères, embeds sans components,
> réponses texte brut, mentions v2.0.0.

## Synthèse

| Indicateur | Valeur |
|---|---|
| Fichiers scannés | 249 |
| Conformes | 55 |
| À upgrader | 194 |
| Avec emojis Unicode | 126 |
| Priorité HIGH | 60 |
| Priorité MEDIUM | 94 |
| Priorité LOW | 40 |

## Constats structurels

- `bot/utils/embeds.js` (ancien helper) utilise encore **PRIMARY = 0xFF0000 (rouge)** au lieu du magenta `0xB600A8` — corriger ce fichier propage la bonne couleur à toutes les anciennes commandes qui l'utilisent.
- Un système d'emojis custom existe déjà : `bot/core/emojis.js` (`e()`, `forButton()`) avec fallbacks Unicode. Le redesign doit passer par ce module plutôt que des placeholders `<:nom:ID>` en dur.
- `package.json` est en version `2.0.0` → bump vers `2.1.2` requis.

## Fichiers à upgrader

| Fichier | Problèmes détectés | Priorité |
|---|---|---|
| bot/commands/configuration/bdayconfig.js | 1 emoji(s) unicode: ✏ | HIGH |
| bot/commands/configuration/bumpconfig.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/configuration/confessionconfig.js | 1 emoji(s) unicode: 🚫 | HIGH |
| bot/commands/configuration/customadd.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/configuration/customedit.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/configuration/customremove.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/configuration/customstats.js | 3 emoji(s) unicode: 🥇 🥈 🥉 | HIGH |
| bot/commands/configuration/welcomeconfig.js | 1 emoji(s) unicode: ✗ · aucune réponse éphémère détectée · réponse texte brut (ni embed ni components) | HIGH |
| bot/commands/information/ping.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/addrole.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/ban.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/clearbans.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/clearmutes.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/clearwarns.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/derank.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/kick.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/modconfig.js | 1 emoji(s) unicode: ✗ · aucune réponse éphémère détectée · réponse texte brut (ni embed ni components) | HIGH |
| bot/commands/moderation/mute.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/nick.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/moderation/nickname.js | 1 emoji(s) unicode: → · aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/removerole.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/unban.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/unmute.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/unwarn.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/warn.js | 1 emoji(s) unicode: ⚠ · aucune réponse éphémère détectée | HIGH |
| bot/commands/moderation/warnconfig.js | 1 emoji(s) unicode: ✗ · aucune réponse éphémère détectée · réponse texte brut (ni embed ni components) | HIGH |
| bot/commands/moderation/warnings.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/protection/alert.js | 1 emoji(s) unicode: 🚨 · aucune réponse éphémère détectée | HIGH |
| bot/commands/protection/antibot.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/anticaps.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antiduplicate.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antiemojispam.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antieveryone.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antiinvite.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antileak.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/protection/antilink.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antimention.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antinewaccount.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antiraid.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/protection/antispam.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/protection/lockdown.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/protection/massban.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/protection/raidmode.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/protection/security.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/protection/securitylogs.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/utility/bday.js | 3 emoji(s) unicode: 🎂 🎉 📅 | HIGH |
| bot/commands/utility/bump.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/utility/bumplb.js | 3 emoji(s) unicode: 🥇 🥈 🥉 · aucune réponse éphémère détectée | HIGH |
| bot/commands/utility/bumpstats.js | 3 emoji(s) unicode: 🥇 🥈 🥉 · aucune réponse éphémère détectée | HIGH |
| bot/commands/utility/confession.js | 3 emoji(s) unicode: ✍ 👍 👎 | HIGH |
| bot/commands/utility/embed.js | aucune réponse éphémère détectée · embed sans components interactifs | HIGH |
| bot/commands/utility/help.js | 2 emoji(s) unicode: ✗ 👑 · aucune réponse éphémère détectée · réponse texte brut (ni embed ni components) | HIGH |
| bot/commands/utility/pairup.js | 1 emoji(s) unicode: 📅 | HIGH |
| bot/commands/utility/reminderlist.js | 1 emoji(s) unicode: 🔁 | HIGH |
| bot/commands/utility/rename.js | 1 emoji(s) unicode: → | HIGH |
| bot/commands/utility/suggestion.js | 2 emoji(s) unicode: 👍 👎 | HIGH |
| bot/commands/utility/suggestlb.js | 5 emoji(s) unicode: 🥇 🥈 🥉 👍 👎 | HIGH |
| bot/commands/utility/tempvoccmd.js | aucune réponse éphémère détectée | HIGH |
| bot/commands/utility/vc.js | 3 emoji(s) unicode: 🔇 🎤 🔕 | HIGH |
| bot/commands/utility/wordchain.js | 4 emoji(s) unicode: → 🥇 🥈 🥉 | HIGH |
| bot/commands/audit-mod/altdetect.js | 1 emoji(s) unicode: 🕵 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/auditfilter.js | 2 emoji(s) unicode: → 📜 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/massnick.js | 3 emoji(s) unicode: → 🏷 ✅ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/massunwarn.js | 2 emoji(s) unicode: 🧹 ✅ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/masswarn.js | 2 emoji(s) unicode: ⚠ ✅ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/moddashboard.js | 4 emoji(s) unicode: 🛡 📊 🏆 ⚡ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/modlog.js | 3 emoji(s) unicode: 📊 📜 📋 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/modstats.js | 4 emoji(s) unicode: 🏆 🎯 📈 📊 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/quarantine.js | 1 emoji(s) unicode: 🔒 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/rolelock.js | 2 emoji(s) unicode: 🔐 🔓 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/searchuser.js | 1 emoji(s) unicode: 🔎 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/audit-mod/unquarantine.js | 2 emoji(s) unicode: 🔒 🕊 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/engagement/autorole.js | 1 emoji(s) unicode: 🎭 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/engagement/levelboard.js | 4 emoji(s) unicode: 🥇 🥈 🥉 🏆 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/engagement/reactionrole.js | 1 emoji(s) unicode: → · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/engagement/xpset.js | 1 emoji(s) unicode: → · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/fun/coinflip.js | 2 emoji(s) unicode: 🪙 🟡 | MEDIUM |
| bot/commands/giveaway/gcreate.js | 1 emoji(s) unicode: 🎉 · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/giveaway/gparticipants.js | 2 emoji(s) unicode: 🔒 🟢 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/giveaway/reroll.js | 1 emoji(s) unicode: 🔄 · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/greeting/testgreet.js | 4 emoji(s) unicode: ✓ ✗ 🟢 🔴 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/auditserver.js | aucune réponse éphémère détectée · réponse texte brut (ni embed ni components) | MEDIUM |
| bot/commands/innovation/channelpermcheck.js | 4 emoji(s) unicode: 🟢 🔴 ✅ ❌ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/channeltemplate.js | 4 emoji(s) unicode: 📂 💬 🔴 ⚠ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/dryrun.js | 3 emoji(s) unicode: ✅ ❌ 🧪 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/exportdata.js | 7 emoji(s) unicode: 👥 📜 📂 ⚙ 💾 📄 ⚠ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/freeze.js | 7 emoji(s) unicode: 🧊 ✅ ⚠ 🔴 📝 🕒 🔒 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/nickrestore.js | 5 emoji(s) unicode: → 🎭 📊 👤 📜 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/purgeemojis.js | 1 emoji(s) unicode: ⚠ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/rolesync.js | 6 emoji(s) unicode: → ✅ ❌ 📊 👤 ⚠ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/schedule.js | 5 emoji(s) unicode: ⚙ 🎯 🕒 💬 📝 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/innovation/unfreeze.js | 4 emoji(s) unicode: 🔥 ✅ 🕒 📝 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/logs/logshelp.js | 11 emoji(s) unicode: 💬 👥 🎭 📂 🎤 ⚙ 🛡 🚀… · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/logs/logsreset.js | 1 emoji(s) unicode: ⚠ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/logs/logsset.js | 3 emoji(s) unicode: 📍 📊 👤 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/logs/logssetup.js | 5 emoji(s) unicode: 🚀 📋 ⚠ 🎯 → · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/logs/logsstatus.js | 5 emoji(s) unicode: 🟢 🔴 📊 📈 🎯 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/logs/logstest.js | 3 emoji(s) unicode: 🧪 → 📍 · aucune réponse éphémère détectée · réponse texte brut (ni embed ni components) | MEDIUM |
| bot/commands/logs/logstoggle.js | 5 emoji(s) unicode: ⚙ 🟢 🔴 👤 🔄 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/alias.js | 1 emoji(s) unicode: → | MEDIUM |
| bot/commands/owner/antijoin.js | 3 emoji(s) unicode: ✓ ✗ → · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/autobackup.js | 2 emoji(s) unicode: ✓ ✗ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/backup.js | 5 emoji(s) unicode: ⚠ ✓ ✗ 🔴 🟢 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/bot.js | 5 emoji(s) unicode: 👥 ⚡ 📡 💾 📦 | MEDIUM |
| bot/commands/owner/listen.js | 1 emoji(s) unicode: → · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/nuke.js | 1 emoji(s) unicode: 💣 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/serverbackuplist.js | 2 emoji(s) unicode: 🤖 👤 | MEDIUM |
| bot/commands/owner/setname.js | 2 emoji(s) unicode: → ⚠ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/setperm.js | 1 emoji(s) unicode: → · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/setupemojis.js | 8 emoji(s) unicode: 🔒 → 📭 ✅ ❌ 🎨 ✓ 💡 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/status.js | 7 emoji(s) unicode: 🏓 📦 🌐 👥 🧠 💾 🟢 | MEDIUM |
| bot/commands/owner/switchall.js | 1 emoji(s) unicode: → · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/owner/template-save.js | 5 emoji(s) unicode: ⚠ ✅ ✗ 🔴 🟢 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/power-admin/archive.js | 1 emoji(s) unicode: 📁 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/power-admin/massrole.js | 2 emoji(s) unicode: ✅ ❌ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/power-admin/servercleanup.js | 5 emoji(s) unicode: 🧹 📂 💬 🎭 🪝 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/power-admin/serverrestore.js | 2 emoji(s) unicode: 📊 ⚠ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/role/createrole.js | 7 emoji(s) unicode: 🎨 📊 📌 ✅ ❌ 💬 👤 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/role/deleterole.js | 1 emoji(s) unicode: ⚠ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/role/editrole.js | 6 emoji(s) unicode: ✅ ❌ ⚙ ⬅ ➡ 👤 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/role/roleinfo.js | 5 emoji(s) unicode: ✅ ❌ 🔗 🔒 📅 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/role/rolelist.js | 3 emoji(s) unicode: 📌 💬 🔗 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/serverforge/generate.js | 11 emoji(s) unicode: ⚠ ✅ 🏗 ❌ 📊 👥 💬 📋… | MEDIUM |
| bot/commands/serverforge/save.js | 12 emoji(s) unicode: 📋 ❌ ✅ 👥 💬 📝 🎉 📊… · embed sans components interactifs | MEDIUM |
| bot/commands/serverforge/sf-reset.js | 6 emoji(s) unicode: ⚠ ❌ ✗ 💣 ✅ ✓ | MEDIUM |
| bot/commands/serverforge/sf-status.js | 9 emoji(s) unicode: ❌ ✅ 📅 👤 📋 📊 👥 💬… · embed sans components interactifs | MEDIUM |
| bot/commands/serverforge/template.js | 12 emoji(s) unicode: ❌ → ✅ 📊 👥 📁 💬 📋… · embed sans components interactifs | MEDIUM |
| bot/commands/stats/compteur.js | 8 emoji(s) unicode: 🔢 💬 🎙 👥 ⚡ 📆 👤 🏆 · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/graph.js | 2 emoji(s) unicode: → 📈 · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/inactif.js | 3 emoji(s) unicode: 🎉 ⚠ 📊 · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/listbday.js | 2 emoji(s) unicode: 🎂 📅 · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/poll.js | 2 emoji(s) unicode: 📊 🗳 · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/reset.js | 3 emoji(s) unicode: ⚠ ✅ ❌ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/stats/role.js | 3 emoji(s) unicode: 👑 ✅ 🔄 · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/settings.js | 11 emoji(s) unicode: ⚙ 🔧 📊 ✅ ❌ ⭐ 🎖 🎂… · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/star.js | 3 emoji(s) unicode: ⭐ ✅ ❌ · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/starboard.js | 1 emoji(s) unicode: ⭐ · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/stats/statembed.js | 7 emoji(s) unicode: 📊 👥 🎙 💬 👤 🏆 → · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/stats/stats.js | 10 emoji(s) unicode: 📊 💬 🎙 👥 👤 📅 🏆 🥇… · aucune réponse éphémère détectée · embed sans components interactifs | MEDIUM |
| bot/commands/ticket/claim.js | 1 emoji(s) unicode: 👤 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/ticket/close.js | 1 emoji(s) unicode: 🔒 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/ticket/closeall.js | 1 emoji(s) unicode: 🔒 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/ticket/deleteall.js | 1 emoji(s) unicode: 🗑 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/ticket/quickticket.js | 1 emoji(s) unicode: 🎫 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/ticket/reopen.js | 1 emoji(s) unicode: 🔓 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/ticket/ticketload.js | 2 emoji(s) unicode: 🐛 🤝 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/utility-pro/calc.js | 1 emoji(s) unicode: 🧮 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/utility-pro/color.js | 1 emoji(s) unicode: 🎨 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/utility-pro/dice.js | 1 emoji(s) unicode: 🎲 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/utility-pro/random.js | 1 emoji(s) unicode: 🎲 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/utility-pro/screenshot.js | 1 emoji(s) unicode: 📸 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/utility-pro/shorten.js | 1 emoji(s) unicode: 🔗 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/utility-pro/translate.js | 3 emoji(s) unicode: → 🌍 🏳 · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/utility-pro/weather.js | 15 emoji(s) unicode: ☀ ☁ 🌧 🌦 ⛈ ❄ 🌫 🌪… · aucune réponse éphémère détectée | MEDIUM |
| bot/commands/fun/8ball.js | aucune réponse éphémère détectée | LOW |
| bot/commands/giveaway/gend.js | aucune réponse éphémère détectée · embed sans components interactifs | LOW |
| bot/commands/greeting/greeting.js | aucune réponse éphémère détectée | LOW |
| bot/commands/greeting/joiner.js | aucune réponse éphémère détectée | LOW |
| bot/commands/greeting/leaver.js | aucune réponse éphémère détectée | LOW |
| bot/commands/greeting/setwelcome.js | aucune réponse éphémère détectée | LOW |
| bot/commands/logs/logs.js | aucune réponse éphémère détectée | LOW |
| bot/commands/logs/logsview.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/addperm.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/blacklist.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/cmdonly.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/delperm.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/disable.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/duperm.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/manager.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/mp.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/newperm.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/prefix.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/removeperm.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/say.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/setbanner.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/setbio.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/setpic.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/statutrotator.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/stream.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/switch.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/theme.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/unblacklist.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/unmanager.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/unsetperm.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/unwhitelist.js | aucune réponse éphémère détectée | LOW |
| bot/commands/owner/whitelist.js | aucune réponse éphémère détectée | LOW |
| bot/commands/ticket/add.js | aucune réponse éphémère détectée | LOW |
| bot/commands/ticket/delete.js | aucune réponse éphémère détectée | LOW |
| bot/commands/ticket/remove.js | aucune réponse éphémère détectée | LOW |
| bot/commands/ticket/rename.js | aucune réponse éphémère détectée | LOW |
| bot/commands/ticket/ticket.js | aucune réponse éphémère détectée | LOW |
| bot/commands/ticket/ticketconfig.js | aucune réponse éphémère détectée | LOW |
| bot/commands/utility-pro/qrcode.js | aucune réponse éphémère détectée | LOW |
| bot/commands/utility-pro/timer.js | aucune réponse éphémère détectée | LOW |

## Fichiers conformes

- bot/commands/configuration/autoreact.js
- bot/commands/configuration/autoreactlist.js
- bot/commands/configuration/custom.js
- bot/commands/configuration/customlist.js
- bot/commands/configuration/formclose.js
- bot/commands/configuration/formdelete.js
- bot/commands/configuration/formlist.js
- bot/commands/configuration/formstats.js
- bot/commands/configuration/formulaire.js
- bot/commands/configuration/pairupconfig.js
- bot/commands/configuration/suggestionconfig.js
- bot/commands/configuration/tempvoc.js
- bot/commands/configuration/twitchconfig.js
- bot/commands/giveaway/giveaway.js
- bot/commands/information/avatar.js
- bot/commands/information/serverinfo.js
- bot/commands/information/userinfo.js
- bot/commands/moderation/clear.js
- bot/commands/moderation/find.js
- bot/commands/moderation/hide.js
- bot/commands/moderation/lock.js
- bot/commands/moderation/show.js
- bot/commands/moderation/slowmode.js
- bot/commands/moderation/unlock.js
- bot/commands/owner/addowner.js
- bot/commands/owner/buyer.js
- bot/commands/owner/buyers.js
- bot/commands/owner/competing.js
- bot/commands/owner/customtransfer.js
- bot/commands/owner/footer.js
- bot/commands/owner/owners.js
- bot/commands/owner/perms.js
- bot/commands/owner/playing.js
- bot/commands/owner/rank.js
- bot/commands/owner/renewperms.js
- bot/commands/owner/resetperms.js
- bot/commands/owner/resetstatut.js
- bot/commands/owner/serverbackup.js
- bot/commands/owner/serverbackupconfig.js
- bot/commands/owner/serverbackuprestore.js
- bot/commands/owner/serverlist.js
- bot/commands/owner/unbuyer.js
- bot/commands/owner/unowner.js
- bot/commands/owner/watch.js
- bot/commands/protection/antiexplicit.js
- bot/commands/protection/antiwords.js
- bot/commands/protection/blacklist.js
- bot/commands/protection/whitelist.js
- bot/commands/utility/pin.js
- bot/commands/utility/reminder.js
- bot/commands/utility/reminderdelete.js
- bot/commands/utility/topic.js
- bot/commands/utility/twitch.js
- bot/commands/utility/twitchlist.js
- bot/commands/_template.js

## Nouvelles commandes à créer

- `/botconfig nickname <nom>` — nickname du bot par serveur (ManageGuild)
- `/botconfig banner <url>` — identité visuelle par serveur, stockée en DB (ManageGuild)
- `/botconfig status` — statut de présence global (BotOwner uniquement)
- `/botconfig activity <type> <texte>` — activité globale (BotOwner uniquement)
- `/botconfig reset` — reset config bot de ce serveur (ManageGuild)

## Infra à créer

- `bot/utils/response-builder.js` — helper réponses standard (success/error/info/confirm)
- `bot/core/guild-config.js` — CRUD table `guild_bot_config`
- Table SQLite `guild_bot_config` (guild_id, nickname, banner_url, embed_color, updated_at, updated_by)
