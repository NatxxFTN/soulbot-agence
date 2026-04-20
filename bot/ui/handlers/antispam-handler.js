'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { renderAntispamPanel, renderAntispamWhitelistPanel } = require('../panels/antispam-panel');
const { buildModal } = require('../components/modals');
const { getAntispamConfig, updateAntispamConfig, addWhitelistRole, removeWhitelistRole, VALID_SANCTIONS } = require('../../core/antispam-helper');
const { EMOJIS } = require('../theme');

const SANCTION_FIELDS = {
  sanction_flood   : 'flood_sanction',
  sanction_mentions: 'mentions_sanction',
  sanction_repeat  : 'repeat_sanction',
  sanction_caps    : 'caps_sanction',
};

async function handleAntispamInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: `${EMOJIS.cross()} Tu dois être administrateur du serveur.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const action  = interaction.customId.replace('antispam:', '');
  const guildId = interaction.guild.id;

  try {

    // ── Toggle global ──────────────────────────────────────────────────────
    if (action === 'toggle') {
      const cfg = getAntispamConfig(guildId) || {};
      updateAntispamConfig(guildId, { enabled: cfg.enabled ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Toggle CAPS ────────────────────────────────────────────────────────
    if (action === 'caps_toggle') {
      const cfg = getAntispamConfig(guildId) || {};
      updateAntispamConfig(guildId, { caps_enabled: cfg.caps_enabled ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Sanctions par type ─────────────────────────────────────────────────
    if (SANCTION_FIELDS[action]) {
      const value = interaction.values[0];
      if (!VALID_SANCTIONS.includes(value)) {
        return interaction.reply({ content: `${EMOJIS.cross()} Sanction invalide.`, flags: MessageFlags.Ephemeral });
      }
      updateAntispamConfig(guildId, { [SANCTION_FIELDS[action]]: value }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Modal Flood ────────────────────────────────────────────────────────
    if (action === 'flood_modal') {
      const cfg = getAntispamConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'antispam:flood_save',
        title   : 'Configuration Flood',
        inputs  : [
          { id: 'threshold', label: 'Msgs max (2-20)',    paragraph: false, maxLength: 2, required: true, value: String(cfg.flood_threshold ?? 5),      placeholder: '5'  },
          { id: 'window',    label: 'Secondes (1-60)',    paragraph: false, maxLength: 2, required: true, value: String(cfg.flood_window_seconds ?? 5), placeholder: '5'  },
        ],
      }));
    }
    if (action === 'flood_save') {
      const t = parseInt(interaction.fields.getTextInputValue('threshold'), 10);
      const w = parseInt(interaction.fields.getTextInputValue('window'), 10);
      if (isNaN(t) || t < 2 || t > 20) {
        return interaction.reply({ content: `${EMOJIS.cross()} Msgs max doit être entre **2** et **20**.`, flags: MessageFlags.Ephemeral });
      }
      if (isNaN(w) || w < 1 || w > 60) {
        return interaction.reply({ content: `${EMOJIS.cross()} Secondes doit être entre **1** et **60**.`, flags: MessageFlags.Ephemeral });
      }
      updateAntispamConfig(guildId, { flood_threshold: t, flood_window_seconds: w }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Modal Mentions ─────────────────────────────────────────────────────
    if (action === 'mentions_modal') {
      const cfg = getAntispamConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'antispam:mentions_save',
        title   : 'Configuration Mentions',
        inputs  : [
          { id: 'threshold', label: 'Mentions max (1-50)', paragraph: false, maxLength: 2, required: true, value: String(cfg.mentions_threshold ?? 5), placeholder: '5' },
        ],
      }));
    }
    if (action === 'mentions_save') {
      const t = parseInt(interaction.fields.getTextInputValue('threshold'), 10);
      if (isNaN(t) || t < 1 || t > 50) {
        return interaction.reply({ content: `${EMOJIS.cross()} Mentions max doit être entre **1** et **50**.`, flags: MessageFlags.Ephemeral });
      }
      updateAntispamConfig(guildId, { mentions_threshold: t }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Modal Répétition ───────────────────────────────────────────────────
    if (action === 'repeat_modal') {
      const cfg = getAntispamConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'antispam:repeat_save',
        title   : 'Configuration Répétition',
        inputs  : [
          { id: 'threshold', label: 'Répétitions max (2-10)', paragraph: false, maxLength: 2, required: true, value: String(cfg.repeat_threshold ?? 3), placeholder: '3' },
        ],
      }));
    }
    if (action === 'repeat_save') {
      const t = parseInt(interaction.fields.getTextInputValue('threshold'), 10);
      if (isNaN(t) || t < 2 || t > 10) {
        return interaction.reply({ content: `${EMOJIS.cross()} Répétitions max doit être entre **2** et **10**.`, flags: MessageFlags.Ephemeral });
      }
      updateAntispamConfig(guildId, { repeat_threshold: t }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Modal CAPS ─────────────────────────────────────────────────────────
    if (action === 'caps_modal') {
      const cfg = getAntispamConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'antispam:caps_save',
        title   : 'Configuration CAPS',
        inputs  : [
          { id: 'threshold',  label: 'CAPS % minimum (50-100)',  paragraph: false, maxLength: 3, required: true, value: String(cfg.caps_threshold  ?? 70), placeholder: '70' },
          { id: 'min_length', label: 'Longueur minimum (1-50)',  paragraph: false, maxLength: 2, required: true, value: String(cfg.caps_min_length ?? 10), placeholder: '10' },
        ],
      }));
    }
    if (action === 'caps_save') {
      const t = parseInt(interaction.fields.getTextInputValue('threshold'), 10);
      const m = parseInt(interaction.fields.getTextInputValue('min_length'), 10);
      if (isNaN(t) || t < 50 || t > 100) {
        return interaction.reply({ content: `${EMOJIS.cross()} % CAPS doit être entre **50** et **100**.`, flags: MessageFlags.Ephemeral });
      }
      if (isNaN(m) || m < 1 || m > 50) {
        return interaction.reply({ content: `${EMOJIS.cross()} Longueur minimum doit être entre **1** et **50**.`, flags: MessageFlags.Ephemeral });
      }
      updateAntispamConfig(guildId, { caps_threshold: t, caps_min_length: m }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Salon logs ─────────────────────────────────────────────────────────
    if (action === 'logs') {
      updateAntispamConfig(guildId, { logs_channel_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }
    if (action === 'logs_reset') {
      updateAntispamConfig(guildId, { logs_channel_id: null }, interaction.user.id);
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Whitelist ──────────────────────────────────────────────────────────
    if (action === 'whitelist') {
      return interaction.update(renderAntispamWhitelistPanel(guildId));
    }
    if (action === 'whitelist_add') {
      addWhitelistRole(guildId, interaction.values[0], interaction.user.id);
      return interaction.update(renderAntispamWhitelistPanel(guildId));
    }
    if (action === 'whitelist_remove') {
      removeWhitelistRole(guildId, interaction.values[0]);
      return interaction.update(renderAntispamWhitelistPanel(guildId));
    }

    if (action === 'back_main') {
      return interaction.update(renderAntispamPanel(guildId));
    }

    // ── Aide ───────────────────────────────────────────────────────────────
    if (action === 'help') {
      return interaction.reply({
        content:
          `❓ **Aide Anti-Spam**\n\n` +
          `💥 **Flood** — N messages en X secondes\n` +
          `📢 **Mentions** — N @mentions dans un message\n` +
          `🔄 **Répétition** — Même message N fois de suite\n` +
          `🔡 **CAPS** — Message avec X% de majuscules (longueur min Y)\n\n` +
          `**Sanctions :**\n` +
          `🗑️ Supprimer · ⚠️ Avertir · ⏱️ Timeout · 👢 Expulser · 🔨 Bannir · 🚫 Aucune\n\n` +
          `**Whitelist :** les membres ayant un rôle exempté ne sont pas vérifiés.`,
        flags: MessageFlags.Ephemeral,
      });
    }

  } catch (err) {
    console.error('[antispam-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${EMOJIS.cross()} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('antispam', (i) => handleAntispamInteraction(i));
  client.selectHandlers.set('antispam', (i) => handleAntispamInteraction(i));
  client.modalHandlers .set('antispam', (i) => handleAntispamInteraction(i));
}

module.exports = { handleAntispamInteraction, register };
