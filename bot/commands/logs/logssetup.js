'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// ;logssetup — Auto-création catégorie "📋 Logs Soulbot" + 9 salons + routing complet
// 9e salon : #message-activity (pour message_create, OFF par défaut)
// @everyone = pas de vue · bot = perms explicites par salon
// ═══════════════════════════════════════════════════════════════════════════

const {
  ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

const V3 = require('../../core/logs-v3-helper');
const {
  newContainer, buildHeader, separator, text, toV2Payload,
  errorEmbed, warningEmbed, infoEmbed, toEmbedReply, statusV2Panel,
} = require('../../ui/panels/_premium-helpers');
const { e } = require('../../core/emojis');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 7 salons : groups → événements routés
// #mod-logs absorbe les events serveur (server_update/emoji/boost/invite)
// pour réduire la pollution de salons. Le default channel = mod-logs (fallback).
const SETUP_PLAN = [
  { name: 'mod-logs',         routeEvents: ['member_ban', 'member_unban', 'member_kick',
                                             'mod_warn', 'mod_mute', 'mod_unmute', 'mod_timeout',
                                             'server_update', 'emoji_update', 'boost_add', 'invite_create'],
                              description: 'Ban · kick · warn · mute · timeout · audit serveur' },
  { name: 'member-logs',      routeEvents: ['member_join', 'member_leave', 'member_nickname_change'],
                              description: 'Join · leave · pseudo' },
  { name: 'message-logs',     routeEvents: ['message_delete', 'message_edit', 'message_bulk_delete'],
                              description: 'Suppression · édition · bulk delete' },
  { name: 'message-activity', routeEvents: ['message_create'],
                              description: 'Activité messages (OFF par défaut, opt-in)' },
  { name: 'role-logs',        routeEvents: ['role_create', 'role_delete', 'role_update', 'role_permission_change'],
                              description: 'Create · delete · update · permissions' },
  { name: 'channel-logs',     routeEvents: ['channel_create', 'channel_delete', 'channel_update'],
                              description: 'Create · delete · update' },
  { name: 'voice-logs',       routeEvents: ['voice_join', 'voice_leave', 'voice_move'],
                              description: 'Join · leave · move' },
];

module.exports = {
  name       : 'logssetup',
  aliases    : ['logsauto', 'setuplog', 'setuplogs'],
  description: 'Crée automatiquement la catégorie + 9 salons de logs + routing complet (28 events)',
  usage      : ';logssetup',
  cooldown   : 30,
  guildOnly  : true,
  permissions: ['ManageGuild', 'ManageChannels'],

  async execute(message) {
    const guild = message.guild;

    const me = guild.members.me;
    if (!me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
      return message.reply(toEmbedReply(errorEmbed({
        title      : 'Permissions bot insuffisantes',
        description: 'Le bot doit avoir **Gérer les salons** + **Gérer les rôles** pour lancer le setup.',
        category   : 'Logs V3',
      })));
    }

    const cfg = V3.getConfig(guild.id);
    const alreadyConfigured = cfg.version === 'v3' && cfg.category_id && cfg.default_channel_id;

    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'cat_innovation',
      title    : 'Setup Logs V3 — Confirmation',
      subtitle : `**${guild.name}** · par ${message.author.tag}`,
    });

    const totalEvents = Object.keys(V3.EVENT_TYPES).length;
    container.addTextDisplayComponents(
      text(
        `> 🚀 **Action automatisée.** Je vais créer :\n` +
        `> • 1 catégorie **📋 Logs Soulbot**\n` +
        `> • **7 salons** de logs dédiés\n` +
        `> • Permissions : @everyone sans vue, bot avec envoi explicite\n` +
        `> • Routing complet des **${totalEvents}** events V3\n` +
        `> • \`message_create\` désactivé par défaut (opt-in)`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    const planPreview = SETUP_PLAN.map(s => `• \`#${s.name}\` — ${s.description}`).join('\n');
    container.addTextDisplayComponents(
      text(`## Salons à créer\n${planPreview}`),
    );
    container.addSeparatorComponents(separator('Small'));

    if (alreadyConfigured) {
      container.addTextDisplayComponents(
        text(`> ⚠️ **Setup déjà effectué** (catégorie ID <#${cfg.category_id}>). Cette action créera une **nouvelle** catégorie en parallèle.`),
      );
      container.addSeparatorComponents(separator('Small'));
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('logs:setup:confirm')
        .setLabel('Lancer le setup')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🚀'),
      new ButtonBuilder()
        .setCustomId('logs:setup:cancel')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary),
    );
    container.addActionRowComponents(row);

    container.addTextDisplayComponents(text(`-# Timeout 60s · Soulbot v2.0 · Logs V3`));

    const prompt = await message.reply(toV2Payload(container));

    const collector = prompt.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time  : 60_000,
      max   : 1,
    });

    collector.on('collect', async interaction => {
      const [, , action] = interaction.customId.split(':');
      if (action === 'cancel') {
        return interaction.update(statusV2Panel({
          status     : 'info',
          title      : 'Setup annulé',
          description: 'Aucun salon créé.',
          category   : 'Logs V3',
        }));
      }

      await interaction.deferUpdate();
      await interaction.editReply(statusV2Panel({
        status     : 'info',
        title      : 'Setup en cours...',
        description: `Création catégorie + 7 salons (~10s — délais anti-rate-limit).`,
        category   : 'Logs V3',
      }));

      let category, createdChannels = [], errors = [];

      const adminRoles = guild.roles.cache
        .filter(r => !r.managed && r.id !== guild.id && r.permissions.has(PermissionFlagsBits.Administrator))
        .map(r => r.id);

      const BOT_PERMS = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
      ];

      try {
        // ── 1. Catégorie ──────────────────────────────────────────
        category = await guild.channels.create({
          name  : '📋 Logs Soulbot',
          type  : ChannelType.GuildCategory,
          reason: `[logssetup] par ${message.author.tag}`,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: me.id, allow: BOT_PERMS },
            ...adminRoles.map(rid => ({ id: rid, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] })),
          ],
        });
        await sleep(600);

        // ── 2. 7 Salons ──────────────────────────────────────────
        for (const plan of SETUP_PLAN) {
          try {
            const ch = await guild.channels.create({
              name  : plan.name,
              type  : ChannelType.GuildText,
              parent: category.id,
              reason: `[logssetup] par ${message.author.tag}`,
              topic : plan.description,
              permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: me.id, allow: BOT_PERMS },
                ...adminRoles.map(rid => ({ id: rid, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] })),
              ],
            });
            createdChannels.push({ plan, channel: ch });
            await sleep(500);
          } catch (err) {
            errors.push(`\`${plan.name}\` : ${err.message}`);
          }
        }

        // ── 3. Config V3 ──────────────────────────────────────────
        // Default channel = #mod-logs (fallback pour tout event sans routing dédié).
        const modLogs = createdChannels.find(c => c.plan.name === 'mod-logs')?.channel;
        if (modLogs) V3.setDefaultChannel(guild.id, modLogs.id, message.author.id);
        V3.setCategoryId(guild.id, category.id, message.author.id);
        V3.setGlobalEnabled(guild.id, true, message.author.id);

        // ── 4. Routing par événement (28 events vers 7 salons) ──
        for (const c of createdChannels) {
          if (!c.plan.routeEvents) continue;
          for (const eventType of c.plan.routeEvents) {
            V3.setEventChannel(guild.id, eventType, c.channel.id);
          }
        }

        // ── 5. Toggles : tous ON sauf message_create ────────────
        // Garantie : on force chaque event explicitement
        const eventsToEnable = Object.keys(V3.EVENT_TYPES);
        for (const eventType of eventsToEnable) {
          const enabled = eventType !== 'message_create';
          V3.toggleEvent(guild.id, eventType, enabled);
        }

        // ── 6. Filter ignore_bot uniquement pour message_create ─
        // Idempotent : si déjà présent en DB, ne pas dupliquer
        try {
          const existing = V3.checkFilters(guild.id, 'message_create', { isBot: true });
          if (existing !== false) {
            V3.addFilter(guild.id, 'message_create', 'ignore_bot', 'true');
          }
        } catch { /* déjà existant */ }

        // ── 7. Cache invalidation + bootstrap (CRITIQUE) ────────
        V3.invalidateGuildCache(guild.id);
        V3.bootstrapGuildCache(guild.id);

      } catch (err) {
        return interaction.editReply(statusV2Panel({
          status     : 'error',
          title      : 'Échec critique',
          description: err.message,
          category   : 'Logs V3',
        }));
      }

      // ── 8. Rapport final V2 panel ─────────────────────────────
      const report = newContainer();
      buildHeader(report, {
        emojiKey : 'btn_success',
        title    : `Setup Logs V3 terminé · ${guild.name}`,
        subtitle : `**${createdChannels.length}/${SETUP_PLAN.length}** salons créés · catégorie <#${category.id}>`,
      });

      const lines = createdChannels.map(c => {
        const meta = c.plan.routeEvents
          ? `${c.plan.routeEvents.length} event(s) routé(s)`
          : 'fallback default';
        return `• <#${c.channel.id}> · *${meta}*`;
      }).join('\n');

      report.addTextDisplayComponents(text(`## Salons créés\n${lines}`));
      report.addSeparatorComponents(separator('Small'));

      if (errors.length) {
        report.addTextDisplayComponents(
          text(`## ⚠️ Erreurs\n${errors.slice(0, 5).map(x => `• ${x}`).join('\n')}`),
        );
        report.addSeparatorComponents(separator('Small'));
      }

      report.addTextDisplayComponents(
        text(
          `## ${e('btn_tip') || '🎯'} Prochaines étapes\n` +
          `• Tester un event : changer un pseudo, supprimer un message → vérifier les salons\n` +
          `• Activer la traque messages : \`;logstoggle message_create\`\n` +
          `• Panel principal : \`;logs\`\n` +
          `• Vue compacte : \`;logsstatus\``,
        ),
      );

      report.addTextDisplayComponents(text(`-# Soulbot v2.0 · Logs V3 Ultimate · ${Object.keys(V3.EVENT_TYPES).length} events activés`));

      return interaction.editReply(toV2Payload(report));
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await prompt.edit(statusV2Panel({
          status     : 'warning',
          title      : 'Temps écoulé',
          description: 'Setup annulé — confirmation non reçue.',
          category   : 'Logs V3',
        })).catch(() => {});
      }
    });
  },
};
