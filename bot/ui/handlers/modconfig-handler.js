'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { buildModal }           = require('../components/modals');
const { renderModconfigPanel } = require('../panels/modconfig-panel');
const { getModConfig, updateModConfig, resetModField } = require('../../core/mod-helper');
const { EMOJIS } = require('../theme');

const MIN_DUR = 60;        // 1 minute
const MAX_DUR = 2419200;   // 28 jours (limite Discord timeout)

function parseDuration(raw) {
  const s = raw.trim().toLowerCase();
  // Accepte : "600", "10m", "1h", "1h30m", "1d", "7d12h"
  let total = 0;
  const matches = s.matchAll(/(\d+)\s*([smhd]?)/g);
  for (const [, num, unit] of matches) {
    const n = parseInt(num, 10);
    switch (unit) {
      case 'd': total += n * 86400; break;
      case 'h': total += n * 3600;  break;
      case 'm': total += n * 60;    break;
      default:  total += n;         break; // secondes par défaut
    }
  }
  return total;
}

async function handleModconfigInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: `${EMOJIS.cross()} Tu dois être administrateur du serveur.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const customId = interaction.customId;
  const action   = customId.replace('modconfig:', '');
  const guildId  = interaction.guild.id;

  try {
    // ── Salon logs ─────────────────────────────────────────────────────────────
    if (action === 'logs') {
      updateModConfig(guildId, { logs_channel_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }
    if (action === 'logs_reset') {
      resetModField(guildId, 'logs_channel_id', interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }

    // ── Rôles ──────────────────────────────────────────────────────────────────
    if (action === 'mod_role') {
      updateModConfig(guildId, { mod_role_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }
    if (action === 'mod_role_reset') {
      resetModField(guildId, 'mod_role_id', interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }
    if (action === 'muted_role') {
      updateModConfig(guildId, { muted_role_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }
    if (action === 'muted_role_reset') {
      resetModField(guildId, 'muted_role_id', interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }

    // ── Durée mute — ouvre modal ───────────────────────────────────────────────
    if (action === 'mute_dur_modal') {
      const cfg = getModConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'modconfig:mute_dur_save',
        title   : 'Durée mute par défaut',
        inputs  : [{
          id         : 'duration',
          label      : 'Durée (ex: 10m, 1h, 1d) — min 60s, max 28j',
          placeholder: '600',
          value      : String(cfg.default_mute_duration ?? 600),
          maxLength  : 20,
          required   : true,
        }],
      }));
    }

    // ── Durée timeout — ouvre modal ────────────────────────────────────────────
    if (action === 'timeout_dur_modal') {
      const cfg = getModConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'modconfig:timeout_dur_save',
        title   : 'Durée timeout par défaut',
        inputs  : [{
          id         : 'duration',
          label      : 'Durée (ex: 10m, 1h, 1d) — min 60s, max 28j',
          placeholder: '600',
          value      : String(cfg.default_timeout_duration ?? 600),
          maxLength  : 20,
          required   : true,
        }],
      }));
    }

    // ── Sauvegarde durée mute ──────────────────────────────────────────────────
    if (action === 'mute_dur_save') {
      const raw  = interaction.fields.getTextInputValue('duration');
      const secs = parseDuration(raw);
      if (secs < MIN_DUR || secs > MAX_DUR) {
        return interaction.reply({
          content: `✗ Durée invalide. Min : \`60s\` (1min) — Max : \`2419200s\` (28j). Valeur saisie : ${secs}s.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      updateModConfig(guildId, { default_mute_duration: secs }, interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }

    // ── Sauvegarde durée timeout ───────────────────────────────────────────────
    if (action === 'timeout_dur_save') {
      const raw  = interaction.fields.getTextInputValue('duration');
      const secs = parseDuration(raw);
      if (secs < MIN_DUR || secs > MAX_DUR) {
        return interaction.reply({
          content: `✗ Durée invalide. Min : \`60s\` (1min) — Max : \`2419200s\` (28j). Valeur saisie : ${secs}s.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      updateModConfig(guildId, { default_timeout_duration: secs }, interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }

    // ── Toggles ────────────────────────────────────────────────────────────────
    if (action === 'dm_toggle') {
      const cfg = getModConfig(guildId) || {};
      updateModConfig(guildId, { dm_sanctioned: cfg.dm_sanctioned !== 0 ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }
    if (action === 'reason_toggle') {
      const cfg = getModConfig(guildId) || {};
      updateModConfig(guildId, { require_reason: cfg.require_reason ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderModconfigPanel(guildId));
    }

    // ── Aide ───────────────────────────────────────────────────────────────────
    if (action === 'help') {
      return interaction.reply({
        content:
          `❓ **Aide Modération**\n\n` +
          `**Salon logs :** reçoit un embed pour chaque action de modération.\n` +
          `**Rôle modérateur :** rôle autorisé à utiliser les commandes de mod.\n` +
          `**Rôle muted :** attribué lors d'un \`;mute\` — retire l'accès aux salons texte.\n` +
          `**Durée mute/timeout :** durée appliquée si aucune durée n'est précisée dans la commande.\n` +
          `**DM membre :** envoie un message privé au membre sanctionné (ban, kick, mute, timeout).\n` +
          `**Raison obligatoire :** si activé, les commandes de mod refusent sans argument raison.`,
        flags: MessageFlags.Ephemeral,
      });
    }

  } catch (err) {
    console.error('[modconfig-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${EMOJIS.cross()} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('modconfig', (i) => handleModconfigInteraction(i));
  client.selectHandlers.set('modconfig', (i) => handleModconfigInteraction(i));
  client.modalHandlers .set('modconfig', (i) => handleModconfigInteraction(i));
}

module.exports = { handleModconfigInteraction, register };
