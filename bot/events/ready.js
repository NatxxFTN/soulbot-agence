'use strict';

const { ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType: DjsChannelType } = require('discord.js');
const { ensureGuild }  = require('../database');
const E                = require('../utils/embeds');

module.exports = {
  name : 'clientReady',
  once : true,

  async execute(client) {
    // Initialise l'identité bot dans le module embeds (nom + avatar URL).
    // POURQUOI ici et nulle part ailleurs : client.user n'est disponible
    // qu'après l'event ready. Appeler init() avant = iconURL null permanent.
    E.init(client.user);

    console.log(`[Bot] Connecté en tant que ${client.user.tag}`);
    console.log(`[Bot] ${client.guilds.cache.size} serveur(s) | ${client.users.cache.size} utilisateur(s)`);

    // Préchargement du cache emojis
    const { reload: reloadEmojis } = require('../core/emojis');
    reloadEmojis();

    // Présence
    const { version } = require('../../package.json');
    client.user.setPresence({
      activities : [{ name: `Version ${version}`, type: ActivityType.Custom }],
      status     : 'online',
    });

    // Initialiser chaque guilde en base
    for (const guild of client.guilds.cache.values()) {
      ensureGuild(guild.id);
    }

    // Mettre en cache les invitations (module invitations)
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        client.inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
      } catch { /* pas de perm MANAGE_GUILD */ }
    }

    // Vérification périodique des rôles anciens (toutes les heures)
    setInterval(() => checkAncientRoles(client), 60 * 60 * 1000);
    // Vérification des anniversaires (tous les jours à minuit approx)
    scheduleBirthdayCheck(client);

    // Démarrer les live StatEmbeds configurés
    const { db } = require('../database');
    const { startLiveUpdate } = require('../commands/stats/statembed');
    const guildsWithEmbed = db.prepare(
      'SELECT guild_id FROM guild_settings WHERE statembed_channel_id IS NOT NULL AND statembed_message_id IS NOT NULL'
    ).all();
    for (const row of guildsWithEmbed) {
      startLiveUpdate(client, row.guild_id, 10 * 60 * 1000);
    }

    // ── Scheduler giveaway (tick 30s) ────────────────────────────────────────
    const { getActiveGiveaways, drawWinners, markEnded } = require('../core/giveaway-helper');
    const { EmbedBuilder } = require('discord.js');

    setInterval(async () => {
      const toEnd = getActiveGiveaways();
      for (const gw of toEnd) {
        try {
          const winners = drawWinners(gw.id, gw.winners_count);
          markEnded(gw.id, winners);
          const ch = await client.channels.fetch(gw.channel_id).catch(() => null);
          if (!ch) continue;
          const mentions = winners.length ? winners.map(w => `<@${w}>`).join(', ') : '*aucun participant*';
          await ch.send({
            content: winners.length ? winners.map(w => `<@${w}>`).join(' ') : '',
            embeds: [
              new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🎉 Giveaway terminé !')
                .setDescription(`**Gain :** ${gw.prize}\n**Gagnant(s) :** ${mentions}`)
                .setTimestamp(),
            ],
          }).catch(() => {});
        } catch (err) {
          console.error(`[Giveaway] Erreur tick #${gw.id}:`, err.message);
        }
      }
    }, 30_000);

    // ── Handlers ticket (bouton panel + select menu type) ────────────────────
    const { createTicket, getConfig } = require('../core/ticket-helper');

    client.buttonHandlers.set('ticket_open', async (interaction) => {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
      try {
        const { channel, number } = await createTicket(interaction.guild, interaction.user);
        await interaction.editReply({ content: `✓ Ticket créé : ${channel}` }).catch(() => {});
        await channel.send({
          content: interaction.user.toString(),
          embeds : [
            E.base()
              .setTitle(`🎫 Ticket #${String(number).padStart(4, '0')}`)
              .setDescription('Un membre du staff va te répondre sous peu.\nUtilise `;close` pour fermer ce ticket.'),
          ],
        });
      } catch (err) {
        const payload = { content: `✗ ${err.message}` };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
        }
      }
    });

    client.selectHandlers.set('ticket_type', async (interaction) => {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
      const type = interaction.values[0];
      const labels = { support: 'Support général', bug: 'Bug / problème', partnership: 'Partenariat', other: 'Autre' };
      try {
        const { channel, number } = await createTicket(interaction.guild, interaction.user, type);
        await interaction.editReply({ content: `✓ Ticket créé : ${channel}` }).catch(() => {});
        await channel.send({
          content: interaction.user.toString(),
          embeds : [
            E.base()
              .setTitle(`🎫 Ticket #${String(number).padStart(4, '0')} — ${labels[type] ?? type}`)
              .setDescription('Un membre du staff va te répondre sous peu.\nUtilise `;close` pour fermer ce ticket.'),
          ],
        });
      } catch (err) {
        const payload = { content: `✗ ${err.message}` };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
        }
      }
    });

    // ── Handlers template (boutons confirmation) ─────────────────────────────
    const { loadTemplate, applyTemplate, logAction: logTplAction } = require('../core/template-helper');

    const isOwner = (userId) => {
      const ids = (process.env.BOT_OWNERS || '').split(',').map(s => s.trim()).filter(Boolean);
      return ids.includes(userId);
    };

    client.buttonHandlers.set('tpl_cancel', async (interaction) => {
      if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '✗ Accès refusé.', ephemeral: true });
      }
      await interaction.update({ embeds: [E.info('Annulé', 'Opération annulée.')], components: [] });
    });

    client.buttonHandlers.set('tpl_confirm', async (interaction, params) => {
      if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '✗ Accès refusé.', ephemeral: true });
      }

      const [name, mode, emjflag] = params;
      const template = loadTemplate(name);
      if (!template) {
        return interaction.update({ embeds: [E.error('Introuvable', `Le template \`${name}\` n'existe plus.`)], components: [] });
      }

      // Check permissions bot AVANT de lancer
      const botMember   = interaction.guild.members.me;
      const neededPerms = ['ManageChannels', 'ManageRoles'];
      if (emjflag === 'emj') neededPerms.push('ManageGuildExpressions');
      const missingPerms = neededPerms.filter(p => !botMember.permissions.has(p));

      if (missingPerms.length > 0) {
        const permLabels = { ManageChannels: 'Gérer les salons', ManageRoles: 'Gérer les rôles', ManageGuildExpressions: 'Gérer les emojis' };
        return interaction.update({
          embeds: [E.error('Permissions insuffisantes', [
            'Le bot n\'a pas les permissions nécessaires sur ce serveur.',
            '',
            '**Permissions manquantes :**',
            ...missingPerms.map(p => `• ${permLabels[p] ?? p}`),
            '',
            '**Solution :**',
            '1. Paramètres du serveur → Rôles',
            '2. Clique sur le rôle du bot',
            '3. Active **Administrateur** (recommandé)',
            '4. Déplace le rôle **EN HAUT** de la liste',
            '5. Relance la commande',
          ].join('\n'))],
          components: [],
        });
      }

      await interaction.update({
        embeds: [E.info('Chargement en cours...', 'Patience, cela peut prendre 1 à 2 minutes.')],
        components: [],
      });

      const startTime = Date.now();
      let lastUpdate  = Date.now();

      try {
        for await (const progress of applyTemplate(interaction.guild, template, {
          mode,
          includeEmojis: emjflag === 'emj',
        })) {
          if (progress.status !== 'done' && Date.now() - lastUpdate > 2000) {
            lastUpdate = Date.now();
            await interaction.editReply({
              embeds: [E.info('En cours...', progress.message || progress.status)],
            }).catch(() => {});
          }

          if (progress.status === 'done') {
            const s          = progress.stats;
            const durationS  = ((Date.now() - startTime) / 1000).toFixed(1);
            const totalOK    = s.rolesCreated + s.categoriesCreated + s.channelsCreated + s.emojisCreated;
            const errCount   = s.errors.length;

            logTplAction({
              action      : 'load',
              templateName: name,
              userId      : interaction.user.id,
              guildId     : interaction.guild.id,
              guildName   : interaction.guild.name,
              mode,
              stats       : s,
              success     : totalOK > 0 && errCount === 0,
              durationMs  : Date.now() - startTime,
            });

            // Diagnostic causes probables
            let hint = '';
            if (errCount > 0) {
              const errStr = s.errors.join(' ').toLowerCase();
              if (errStr.includes('missing permissions') || errStr.includes('missing access')) {
                hint = '\n\n🔴 **Cause :** Le bot manque de permissions.\n1. Rôles du serveur → rôle bot → active **Administrateur**\n2. Déplace le rôle du bot tout en haut\n3. Réessaie';
              } else if (errStr.includes('maximum') || errStr.includes('limit')) {
                hint = '\n\n🟡 **Cause :** Limite Discord atteinte (500 salons / 250 rôles / 50 catégories max).';
              } else if (errStr.includes('rate limit')) {
                hint = '\n\n🟠 **Cause :** Rate limit Discord. Réessaie dans 10 minutes.';
              }
            }

            // Extrait des premières erreurs
            const errorSample = errCount > 0
              ? '\n\n**Erreurs détectées :**\n' +
                s.errors.slice(0, 8).map(e => `• ${e}`).join('\n') +
                (errCount > 8 ? `\n*... et ${errCount - 8} autres*` : '')
              : '';

            // ÉCHEC TOTAL
            if (totalOK === 0 && errCount > 0) {
              return interaction.editReply({
                embeds: [E.error(
                  '✗ Template échoué',
                  `**Template :** \`${name}\`\n**Résultat :** 0 élément créé · ${errCount} erreur(s)\n**Durée :** ${durationS}s` +
                  errorSample + hint
                )],
              });
            }

            // ÉCHEC PARTIEL
            if (totalOK > 0 && errCount > 0) {
              return interaction.editReply({
                embeds: [E.warning(
                  '⚠ Template appliqué partiellement',
                  [
                    `**Template :** \`${name}\``,
                    `👥 **${s.rolesCreated}** rôle(s) · 📁 **${s.categoriesCreated}** catégorie(s) · 💬 **${s.channelsCreated}** salon(s)` +
                    (s.emojisCreated > 0 ? ` · 😀 **${s.emojisCreated}** emoji(s)` : ''),
                    `⚠ **${errCount}** erreur(s) · ⏱ ${durationS}s`,
                  ].join('\n') + errorSample + hint
                )],
              });
            }

            // SUCCÈS COMPLET
            return interaction.editReply({
              embeds: [
                E.success('✓ Template appliqué !')
                  .setDescription(
                    `**Template :** \`${name}\`\n` +
                    `👥 **${s.rolesCreated}** rôle(s) · 📁 **${s.categoriesCreated}** catégorie(s) · 💬 **${s.channelsCreated}** salon(s)` +
                    (s.emojisCreated > 0 ? ` · 😀 **${s.emojisCreated}** emoji(s)` : '') +
                    `\n⏱ Durée : **${durationS}s**`
                  ),
              ],
            });
          }
        }
      } catch (err) {
        logTplAction({
          action      : 'load',
          templateName: name,
          userId      : interaction.user.id,
          guildId     : interaction.guild.id,
          mode,
          success     : false,
          error       : err.message,
        });
        await interaction.editReply({
          embeds: [E.error('Erreur critique', err.message)],
        }).catch(() => {});
      }
    });

    // ── Handlers reset (triple confirmation) ────────────────────────────────
    const { activeResets, COOLDOWN_MS: RESET_COOLDOWN } = require('../commands/owner/nuke');
    const { serializeGuild: serGuild, saveTemplate: saveTpl } = require('../core/template-helper');
    const { db: resetDb } = require('../database');

    client.buttonHandlers.set('reset_cancel', async (interaction) => {
      if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '✗ Accès refusé.', ephemeral: true });
      }
      // Nettoyage de session si présente
      const sid = `${interaction.user.id}-${interaction.guild?.id}`;
      activeResets.delete(sid);
      await interaction.update({ embeds: [E.info('Annulé', 'Nuke annulé.')], components: [] });
    });

    client.buttonHandlers.set('reset_step2', async (interaction, params) => {
      if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '✗ Accès refusé.', ephemeral: true });
      }
      const sessionId = params[0];
      const session   = activeResets.get(sessionId);
      if (!session) {
        return interaction.update({ embeds: [E.error('Session expirée', 'Relance la commande `;nuke`.')], components: [] });
      }

      const finalRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`reset_final:${sessionId}`)
          .setLabel('💣 DÉMARRER LE RESET MAINTENANT')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('reset_cancel')
          .setLabel('✗ Annuler')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.update({
        embeds: [E.error('💣 NUKE SERVEUR — Étape 3/3 (DERNIÈRE CHANCE)',
          `⚠️ **TU VAS DÉCLENCHER LE RESET.**\n\n` +
          `Serveur : **${session.guildName}**\n` +
          `Initié par : <@${session.userId}>\n\n` +
          `**Processus :**\n` +
          `1. Backup automatique (15–30s)\n` +
          `2. Suppression des rôles (1–3 min)\n` +
          `3. Suppression des salons (1–3 min)\n` +
          `4. Suppression des emojis (1–2 min)\n\n` +
          `⏱️ Durée totale estimée : **2–5 minutes**\n\n` +
          `**C'est ta dernière chance d'annuler.**`)],
        components: [finalRow],
      });
    });

    client.buttonHandlers.set('reset_final', async (interaction, params) => {
      if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '✗ Accès refusé.', ephemeral: true });
      }

      const sessionId = params[0];
      const session   = activeResets.get(sessionId);
      if (!session) {
        return interaction.update({ embeds: [E.error('Session expirée', 'Relance la commande `;nuke`.')], components: [] });
      }
      activeResets.delete(sessionId);

      const startTime      = Date.now();
      const guild          = interaction.guild;
      const backupName     = `auto_reset_${Date.now()}`;
      let   channelsDeleted = 0;
      let   rolesDeleted    = 0;
      let   emojisDeleted   = 0;

      await interaction.update({
        embeds: [E.info('💣 RESET EN COURS...', '**Étape 1/4 :** 💾 Création du backup automatique...')],
        components: [],
      });

      try {
        // 1. AUTO-BACKUP obligatoire
        const backupData = await serGuild(guild, { includeEmojis: true });
        saveTpl(backupName, backupData);

        await interaction.editReply({
          embeds: [E.info('💣 RESET EN COURS...',
            `✓ Backup : \`${backupName}\`\n\n` +
            `**Étape 2/4 :** 🗑️ Suppression des rôles...`)],
        }).catch(() => {});

        // 2. Rôles
        const roles = Array.from(guild.roles.cache.values())
          .filter(r => r.editable && !r.managed && r.id !== guild.roles.everyone.id);
        for (const role of roles) {
          try { await role.delete('Reset serveur'); rolesDeleted++; } catch {}
          await new Promise(r => setTimeout(r, 300));
        }

        await interaction.editReply({
          embeds: [E.info('💣 RESET EN COURS...',
            `✓ Backup : \`${backupName}\`\n` +
            `✓ ${rolesDeleted} rôle(s) supprimé(s)\n\n` +
            `**Étape 3/4 :** 🗑️ Suppression des salons...`)],
        }).catch(() => {});

        // 3. Salons (ce channel sera supprimé ici — les editReply suivants échouent silencieusement)
        const channels = Array.from(guild.channels.cache.values()).filter(c => c.deletable);
        for (const ch of channels) {
          try { await ch.delete('Reset serveur'); channelsDeleted++; } catch {}
          await new Promise(r => setTimeout(r, 300));
        }

        // 4. Emojis
        for (const emoji of guild.emojis.cache.values()) {
          try { await emoji.delete('Reset serveur'); emojisDeleted++; } catch {}
          await new Promise(r => setTimeout(r, 500));
        }

        // Cooldown
        resetDb.prepare('INSERT OR REPLACE INTO reset_cooldowns (guild_id, last_reset_at) VALUES (?, ?)')
          .run(session.guildId, Date.now());

        // Log DB
        resetDb.prepare(`
          INSERT INTO reset_logs
            (guild_id, guild_name, user_id, auto_backup_name,
             channels_deleted, roles_deleted, emojis_deleted, duration_ms, success, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(session.guildId, session.guildName, session.userId, backupName,
               channelsDeleted, rolesDeleted, emojisDeleted, Date.now() - startTime, 1, Date.now());

        // DM owner — canal principal de résultat (le serveur est vide)
        try {
          const owner = await interaction.client.users.fetch(session.userId);
          await owner.send({
            embeds: [E.success('✓ Reset terminé',
              `**Serveur :** ${session.guildName}\n` +
              `**Durée :** ${((Date.now() - startTime) / 1000).toFixed(1)}s\n\n` +
              `**Backup disponible :** \`${backupName}\`\n\n` +
              `Pour restaurer : \`;backup restore ${backupName}\`\n\n` +
              `Le serveur est vide, prêt à être reconfiguré.`)],
          });
        } catch {}

        // Tentative message dans un channel textuel restant (best-effort)
        try {
          const textCh = guild.channels.cache.find(c => c.type === DjsChannelType.GuildText);
          if (textCh) {
            await textCh.send({
              embeds: [E.success('✓ Reset terminé', `Backup : \`${backupName}\``)],
            }).catch(() => {});
          }
        } catch {}

      } catch (err) {
        console.error('[reset_final]', err);
        try {
          resetDb.prepare(`
            INSERT INTO reset_logs
              (guild_id, guild_name, user_id, auto_backup_name,
               channels_deleted, roles_deleted, emojis_deleted, duration_ms, success, error, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(session.guildId, session.guildName, session.userId, backupName,
                 channelsDeleted, rolesDeleted, emojisDeleted, Date.now() - startTime, 0, err.message, Date.now());
        } catch {}
        await interaction.editReply({
          embeds: [E.error('Erreur critique', `Reset interrompu à ${channelsDeleted} salons / ${rolesDeleted} rôles supprimés.\n\`${err.message}\``)],
        }).catch(() => {});
      }
    });

    // ── Handler Embed Builder ────────────────────────────────────────────────
    const { handleEmbedInteraction } = require('../ui/handlers/embed-handler');
    client.buttonHandlers.set('emb', handleEmbedInteraction);

    // ── Handlers Bump Disboard ───────────────────────────────────────────────
    const { handleBumpInteraction } = require('../ui/handlers/bump-handler');
    const {
      handleBumpConfigInteraction,
      handleBumpConfigModal,
    } = require('../ui/handlers/bumpconfig-handler');

    client.buttonHandlers.set('bump',    handleBumpInteraction);
    client.buttonHandlers.set('bumpcfg', handleBumpConfigInteraction);
    client.selectHandlers.set('bumpcfg', handleBumpConfigInteraction);
    client.modalHandlers .set('bumpcfg_modal', handleBumpConfigModal);

    // ── Handlers Access Control (buyers + owners panels) ─────────────────────
    const { handleBuyersInteraction } = require('../ui/handlers/buyers-handler');
    const { handleOwnersInteraction } = require('../ui/handlers/owners-handler');
    client.buttonHandlers.set('buyers', handleBuyersInteraction);
    client.buttonHandlers.set('owners', handleOwnersInteraction);

    // ── Handlers Custom Commands (panel + modals + selects) ──────────────────
    const {
      handleCustomInteraction,
      handleCustomModal,
      handleCustomSelect,
    } = require('../ui/handlers/custom-handler');
    client.buttonHandlers.set('custom',        handleCustomInteraction);
    client.modalHandlers .set('custom_modal',  handleCustomModal);
    client.selectHandlers.set('custom_select', handleCustomSelect);

    // ── Handler Security (panel + toggle/config selects + buttons) ───────────
    const { handleSecurityInteraction } = require('../ui/handlers/security-handler');
    client.buttonHandlers.set('security', handleSecurityInteraction);
    client.selectHandlers.set('security', handleSecurityInteraction);

    // ── Handler Security Feature (mini-panels secfeat:<feature>:*) ───────────
    const { handleSecurityFeatureInteraction } = require('../ui/handlers/security-feature-handler');
    client.buttonHandlers.set('secfeat', handleSecurityFeatureInteraction);
    client.selectHandlers.set('secfeat', handleSecurityFeatureInteraction);

    // ── Scheduler Bump (check pending reminders toutes les 60s) ──────────────
    const { startBumpScheduler } = require('../core/bump-scheduler');
    startBumpScheduler(client);

    // ── Handlers Advanced Tools Pack (Prompt 2/3) ────────────────────────────
    const { handleTempvocInteraction, handleTempvocModal } = require('../ui/handlers/tempvoc-handler');
    client.selectHandlers.set('tempvoc',       handleTempvocInteraction);
    client.buttonHandlers.set('tempvoc',       handleTempvocInteraction);
    client.modalHandlers .set('tempvoc_modal', handleTempvocModal);

    const { handleFormInteraction, handleFormModal } = require('../ui/handlers/form-handler');
    client.buttonHandlers.set('form',       handleFormInteraction);
    client.modalHandlers .set('form_modal', handleFormModal);

    const { handleSuggestionInteraction, handleSuggestionModal, handleSuggconfigInteraction } = require('../ui/handlers/suggestion-handler');
    client.buttonHandlers.set('suggest',       handleSuggestionInteraction);
    client.modalHandlers .set('suggest_modal', handleSuggestionModal);
    client.buttonHandlers.set('suggconfig',    handleSuggconfigInteraction);
    client.selectHandlers.set('suggconfig',    handleSuggconfigInteraction);

    const { handleServerbackupInteraction } = require('../ui/handlers/serverbackup-handler');
    client.buttonHandlers.set('sbackcfg',     handleServerbackupInteraction);
    client.selectHandlers.set('sbackcfg',     handleServerbackupInteraction);
    client.buttonHandlers.set('sbackrestore', handleServerbackupInteraction);

    const { handleTwitchInteraction, handleTwitchModal } = require('../ui/handlers/twitch-handler');
    client.buttonHandlers.set('twcfg',       handleTwitchInteraction);
    client.selectHandlers.set('twcfg',       handleTwitchInteraction);
    client.modalHandlers .set('twcfg_modal', handleTwitchModal);

    const { handleReminderButton, handleReminderModal } = require('../ui/handlers/reminder-handler');
    client.buttonHandlers.set('reminder',       handleReminderButton);
    client.modalHandlers .set('reminder_modal', handleReminderModal);

    const { handleTransferInteraction } = require('../commands/owner/customtransfer');
    client.buttonHandlers.set('cxfer', handleTransferInteraction);

    // NOTE : autoreactListener.js et tempvocListener.js sont auto-chargés par
    // bot/core/EventHandler.js qui scanne bot/events/ — pas de client.on() ici
    // pour éviter les listeners en double.

    // Schedulers
    const { startServerbackupScheduler } = require('../core/serverbackup-scheduler');
    const { startTwitchScheduler }       = require('../core/twitch-scheduler');
    const { startReminderScheduler }     = require('../core/reminder-scheduler');
    startServerbackupScheduler(client);
    startTwitchScheduler(client);
    startReminderScheduler(client);

    // ── Handlers Innovation Pack 3/3 ─────────────────────────────────────────
    const { handleConfessionInteraction, handleConfessionModal } = require('../ui/handlers/confession-handler');
    client.buttonHandlers.set('confession',        handleConfessionInteraction);
    client.buttonHandlers.set('confessioncfg',     handleConfessionInteraction);
    client.selectHandlers.set('confessioncfg',     handleConfessionInteraction);
    client.modalHandlers .set('confession_modal',  handleConfessionModal);
    client.modalHandlers .set('confessioncfg_modal', handleConfessionModal);

    const { handleBdayConfigInteraction, handleBdayConfigModal } = require('../ui/handlers/bday-handler');
    client.buttonHandlers.set('bdaycfg',       handleBdayConfigInteraction);
    client.selectHandlers.set('bdaycfg',       handleBdayConfigInteraction);
    client.modalHandlers .set('bdaycfg_modal', handleBdayConfigModal);

    const { handlePairupInteraction } = require('../ui/handlers/pairup-handler');
    client.buttonHandlers.set('pairupcfg', handlePairupInteraction);
    client.selectHandlers.set('pairupcfg', handlePairupInteraction);

    // Schedulers Innovation Pack
    const { startBdayScheduler } = require('../core/bday-scheduler');
    const { startPairupScheduler } = require('../core/pairup-scheduler');
    startBdayScheduler(client);
    startPairupScheduler(client);

    // ── Innovation Pack 1/3 — Gestion & Power Tools ──────────────────────────
    const { register: registerInnovationHandlers } = require('../ui/handlers/innovation-handler');
    registerInnovationHandlers(client);

    const { startScheduleScheduler } = require('../core/schedule-scheduler');
    const { startFreezeScheduler }   = require('../core/freeze-scheduler');
    startScheduleScheduler(client);
    startFreezeScheduler(client);

    // ── Logs V3 Ultimate ─────────────────────────────────────────────────────
    const logsV3 = require('../core/logs-v3-helper');
    logsV3.bootstrapCache();
    const { register: registerLogsV3Handlers } = require('../ui/handlers/logs-v3-handler');
    registerLogsV3Handlers(client);

    console.log('[Bot] Prêt !');
  },
};

// ─── Rôles Ancien ─────────────────────────────────────────────────────────────
async function checkAncientRoles(client) {
  const { db } = require('../database');
  const now    = Math.floor(Date.now() / 1000);

  for (const guild of client.guilds.cache.values()) {
    const rules = db.prepare('SELECT * FROM ancient_roles WHERE guild_id = ? ORDER BY days_threshold ASC').all(guild.id);
    if (!rules.length) continue;

    let members;
    try {
      members = await guild.members.fetch();
    } catch { continue; }

    for (const member of members.values()) {
      if (member.user.bot) continue;
      const daysSince = Math.floor((now - member.joinedTimestamp / 1000) / 86400);

      for (const rule of rules) {
        const role = guild.roles.cache.get(rule.role_id);
        if (!role) continue;

        const qualifies = daysSince >= rule.days_threshold;

        if (qualifies && !member.roles.cache.has(rule.role_id)) {
          await member.roles.add(role).catch(() => {});

          // Si non-cumulatif, retirer les paliers inférieurs
          if (!rule.cumulative) {
            const lowerRules = rules.filter(r => r.days_threshold < rule.days_threshold);
            for (const lr of lowerRules) {
              if (member.roles.cache.has(lr.role_id)) {
                await member.roles.remove(lr.role_id).catch(() => {});
              }
            }
          }
        }
      }
    }
  }
}

// ─── Anniversaires ───────────────────────────────────────────────────────────
function scheduleBirthdayCheck(client) {
  const runCheck = async () => {
    const { db } = require('../database');
    const now   = new Date();
    const day   = now.getDate();
    const month = now.getMonth() + 1;

    const rows = db.prepare('SELECT * FROM birthdays WHERE day = ? AND month = ?').all(day, month);

    for (const row of rows) {
      const settings = db.prepare('SELECT role_bday_id FROM guild_settings WHERE guild_id = ?').get(row.guild_id);
      if (!settings?.role_bday_id) continue;

      const guild = client.guilds.cache.get(row.guild_id);
      if (!guild) continue;

      try {
        const member = await guild.members.fetch(row.user_id);
        if (!member.roles.cache.has(settings.role_bday_id)) {
          await member.roles.add(settings.role_bday_id);
        }
      } catch { /* membre absent */ }
    }
  };

  // Premier lancement immédiat puis toutes les 24h
  runCheck();
  setInterval(runCheck, 24 * 60 * 60 * 1000);
}
