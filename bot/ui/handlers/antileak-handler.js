'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { renderAntileakPanel, renderAntileakWhitelistPanel } = require('../panels/antileak-panel');
const { getAntileakConfig, updateAntileakConfig, addWhitelistRole, removeWhitelistRole, VALID_SANCTIONS } = require('../../core/antileak-helper');
const { EMOJIS } = require('../theme');

const TOGGLE_FIELDS = {
  toggle_discord_token: 'detect_discord_token',
  toggle_ip           : 'detect_ip',
  toggle_email        : 'detect_email',
  toggle_phone        : 'detect_phone',
};

const SANCTION_FIELDS = {
  sanction_discord_token: 'sanction_discord_token',
  sanction_ip           : 'sanction_ip',
  sanction_email        : 'sanction_email',
  sanction_phone        : 'sanction_phone',
};

async function handleAntileakInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: `${EMOJIS.cross()} Tu dois être administrateur du serveur.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const action  = interaction.customId.replace('antileak:', '');
  const guildId = interaction.guild.id;

  try {

    // ── Toggle global ──────────────────────────────────────────────────────
    if (action === 'toggle') {
      const cfg = getAntileakConfig(guildId) || {};
      updateAntileakConfig(guildId, { enabled: cfg.enabled ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderAntileakPanel(guildId));
    }

    // ── Toggles par type ───────────────────────────────────────────────────
    if (TOGGLE_FIELDS[action]) {
      const field = TOGGLE_FIELDS[action];
      const cfg   = getAntileakConfig(guildId) || {};
      updateAntileakConfig(guildId, { [field]: cfg[field] !== 0 ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderAntileakPanel(guildId));
    }

    // ── Sanctions par type ─────────────────────────────────────────────────
    if (SANCTION_FIELDS[action]) {
      const value = interaction.values[0];
      if (!VALID_SANCTIONS.includes(value)) {
        return interaction.reply({ content: `${EMOJIS.cross()} Sanction invalide.`, flags: MessageFlags.Ephemeral });
      }
      updateAntileakConfig(guildId, { [SANCTION_FIELDS[action]]: value }, interaction.user.id);
      return interaction.update(renderAntileakPanel(guildId));
    }

    // ── Salon logs ─────────────────────────────────────────────────────────
    if (action === 'logs') {
      updateAntileakConfig(guildId, { logs_channel_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderAntileakPanel(guildId));
    }
    if (action === 'logs_reset') {
      updateAntileakConfig(guildId, { logs_channel_id: null }, interaction.user.id);
      return interaction.update(renderAntileakPanel(guildId));
    }

    // ── Whitelist ──────────────────────────────────────────────────────────
    if (action === 'whitelist') {
      return interaction.update(renderAntileakWhitelistPanel(guildId));
    }
    if (action === 'whitelist_add') {
      addWhitelistRole(guildId, interaction.values[0], interaction.user.id);
      return interaction.update(renderAntileakWhitelistPanel(guildId));
    }
    if (action === 'whitelist_remove') {
      removeWhitelistRole(guildId, interaction.values[0]);
      return interaction.update(renderAntileakWhitelistPanel(guildId));
    }

    if (action === 'back_main') {
      return interaction.update(renderAntileakPanel(guildId));
    }

    // ── Aide ───────────────────────────────────────────────────────────────
    if (action === 'help') {
      return interaction.reply({
        content:
          `❓ **Aide Anti-Leak**\n\n` +
          `**Types de détection :**\n` +
          `🔑 **Token Discord** — Tokens de bot (dangereux)\n` +
          `🌐 **Adresse IP** — IPv4 et IPv6\n` +
          `📧 **E-mail** — Adresses email\n` +
          `📞 **Téléphone** — Numéros de téléphone\n\n` +
          `**Sanctions :**\n` +
          `🗑️ Supprimer · ⚠️ Avertir · ⏱️ Timeout · 👢 Expulser · 🔨 Bannir · 🚫 Aucune\n\n` +
          `**Whitelist :** les membres ayant un rôle exempté ne sont pas vérifiés.`,
        flags: MessageFlags.Ephemeral,
      });
    }

  } catch (err) {
    console.error('[antileak-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${EMOJIS.cross()} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('antileak', (i) => handleAntileakInteraction(i));
  client.selectHandlers.set('antileak', (i) => handleAntileakInteraction(i));
}

module.exports = { handleAntileakInteraction, register };
