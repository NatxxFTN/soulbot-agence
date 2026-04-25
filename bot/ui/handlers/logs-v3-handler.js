'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// LOGS V3 HANDLER — Routage des customId "logs:*" (Vague 1)
// Pattern : logs:<section>:<action>[:arg]
//
// Sections implémentées Vague 1 :
//   - logs:action:toggle_global → active / désactive master switch
//   - logs:action:setup         → lance la commande ;logssetup (redirection)
//   - logs:action:export        → export JSON de la config
//   - logs:action:refresh       → recharge le panel principal
//
// Sections "Coming soon" (stubs polis) :
//   preset, theme, stats, groups, filters
// ═══════════════════════════════════════════════════════════════════════════

const { MessageFlags, AttachmentBuilder } = require('discord.js');
const { e } = require('../../core/emojis');
const V3 = require('../../core/logs-v3-helper');
const { renderLogsV3Panel } = require('../panels/logs-v3-panel');
const { statusV2Panel } = require('../panels/_premium-helpers');

const COMING_SOON = new Set(['preset', 'theme', 'stats', 'groups', 'filters']);

async function handleLogsButton(interaction, params, client) {
  try {
    const [section, action] = params;
    // params[0] = section ("action", "preset", "setup", ...), params[1] = verb

    // "setup" est géré par un collector côté commande ;logssetup.
    // On ne fait rien ici pour laisser le collector acquitter l'interaction.
    if (section === 'setup') return;

    if (section !== 'action') {
      // Réservé Vague 2+ (preset:<name>:apply, group:<name>:toggle, etc.)
      return interaction.reply({
        content: `${e('btn_tip') || 'ℹ️'} Cette action sera activée en **Vague 2**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Permissions check
    if (!interaction.member?.permissions?.has('ManageGuild')) {
      return interaction.reply({
        content: `${e('btn_error')} Permission requise : **ManageGuild**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── toggle_global ────────────────────────────────────────────────
    if (action === 'toggle_global') {
      const cur = V3.getConfig(interaction.guild.id);
      V3.setGlobalEnabled(interaction.guild.id, !cur.global_enabled, interaction.user.id);
      return interaction.update(renderLogsV3Panel(interaction.guild));
    }

    // ── refresh ──────────────────────────────────────────────────────
    if (action === 'refresh') {
      return interaction.update(renderLogsV3Panel(interaction.guild));
    }

    // ── setup : redirige vers la commande ────────────────────────────
    if (action === 'setup') {
      return interaction.reply({
        content: `${e('btn_tip') || 'ℹ️'} Tape **\`;logssetup\`** dans un salon pour lancer la création auto de la catégorie + 8 salons.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── export ───────────────────────────────────────────────────────
    if (action === 'export') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const config = V3.getConfig(interaction.guild.id);
      const exportData = {
        exported_at : new Date().toISOString(),
        guild_id    : interaction.guild.id,
        guild_name  : interaction.guild.name,
        version     : 'v3',
        config,
        routing     : {}, // rempli ci-dessous
        toggles     : {}, // rempli ci-dessous
        stats_today : V3.getStatsToday(interaction.guild.id),
      };
      for (const eventType of Object.keys(V3.EVENT_TYPES)) {
        exportData.routing[eventType] = V3.getEventChannel(interaction.guild.id, eventType);
        exportData.toggles[eventType] = V3.isEventEnabled(interaction.guild.id, eventType);
      }
      const buf = Buffer.from(JSON.stringify(exportData, null, 2), 'utf8');
      const file = new AttachmentBuilder(buf, { name: `logs-v3-export-${interaction.guild.id}-${Date.now()}.json` });
      return interaction.editReply({
        content: `${e('btn_success')} Export de la config Logs V3 prêt.`,
        files  : [file],
      });
    }

    // ── Stubs Coming Soon ────────────────────────────────────────────
    if (COMING_SOON.has(action)) {
      return interaction.reply({
        content:
          `${e('btn_tip') || 'ℹ️'} **\`${action}\`** arrive en **Vague 2**.\n\n` +
          `Vague 1 = fondations + setup. Vague 2 = contrôles (presets, thèmes, filtres, groupes, stats complètes).`,
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: `${e('btn_error')} Action inconnue : \`${action}\`.`,
      flags  : MessageFlags.Ephemeral,
    });
  } catch (err) {
    console.error('[logs-v3-handler]', err);
    const payload = {
      content: `${e('btn_error')} Erreur handler Logs V3.`,
      flags  : MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('logs', handleLogsButton);
  client.selectHandlers.set('logs', handleLogsButton);
}

module.exports = { register, handleLogsButton };
