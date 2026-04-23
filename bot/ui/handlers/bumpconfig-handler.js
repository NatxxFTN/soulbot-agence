'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/bump-storage');
const { renderBumpConfigPanel } = require('../panels/bumpconfig-panel');
const { sendBumpReminder } = require('../../core/bump-scheduler');

// ── Guard permission ──────────────────────────────────────────────────────────

function ensureManageGuild(interaction) {
  if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({
      content: `${e('btn_error')} Tu as besoin de la permission **Gérer le serveur**.`,
      flags  : MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
  return true;
}

async function refreshPanel(interaction) {
  const payload = renderBumpConfigPanel(interaction.guild.id);
  await interaction.update(payload);
}

// ── Routeur boutons + selects ────────────────────────────────────────────────

async function handleBumpConfigInteraction(interaction, params) {
  const action = params[0];
  if (!ensureManageGuild(interaction)) return;

  const current = storage.getConfig(interaction.guild.id) || {
    channel_id: null, role_id: null, custom_message: null, enabled: 0,
  };

  try {
    // ── ChannelSelect ──────────────────────────────────────────────────────
    if (action === 'channel' && interaction.isChannelSelectMenu?.()) {
      storage.setConfig(interaction.guild.id, {
        ...current,
        channel_id: interaction.values[0],
      });
      return refreshPanel(interaction);
    }

    // ── RoleSelect ─────────────────────────────────────────────────────────
    if (action === 'role' && interaction.isRoleSelectMenu?.()) {
      storage.setConfig(interaction.guild.id, {
        ...current,
        role_id: interaction.values[0],
      });
      return refreshPanel(interaction);
    }

    // ── Retirer rôle ping ──────────────────────────────────────────────────
    if (action === 'role_none') {
      storage.setConfig(interaction.guild.id, { ...current, role_id: null });
      return refreshPanel(interaction);
    }

    // ── Toggle activation ──────────────────────────────────────────────────
    if (action === 'toggle') {
      const newEnabled = current.enabled ? 0 : 1;
      if (newEnabled && !current.channel_id) {
        return interaction.reply({
          content: `${e('btn_error')} Configure un salon d'abord.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      storage.setConfig(interaction.guild.id, { ...current, enabled: newEnabled });
      return refreshPanel(interaction);
    }

    // ── Message custom (modal) ─────────────────────────────────────────────
    if (action === 'message') {
      const modal = new ModalBuilder()
        .setCustomId('bumpcfg_modal:message')
        .setTitle('Message de rappel custom')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('custom_msg')
              .setLabel('Message (vide = reset défaut)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(1500)
              .setRequired(false)
              .setValue(current.custom_message || '')
              .setPlaceholder("Message envoyé 2h après chaque bump…"),
          ),
        );
      return interaction.showModal(modal);
    }

    // ── Test rappel ────────────────────────────────────────────────────────
    if (action === 'test') {
      if (!current.channel_id) {
        return interaction.reply({
          content: `${e('btn_error')} Configure un salon d'abord.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      const channel = await interaction.guild.channels.fetch(current.channel_id).catch(() => null);
      if (!channel?.isTextBased()) {
        return interaction.reply({
          content: `${e('btn_error')} Salon introuvable ou non texte.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
      try {
        await sendBumpReminder(channel, interaction.guild, current);
        await interaction.editReply({
          content: `${e('btn_success')} Test envoyé dans ${channel}.`,
        });
      } catch (err) {
        await interaction.editReply({
          content: `${e('btn_error')} Erreur test : ${err.message}`,
        }).catch(() => {});
      }
      return;
    }
  } catch (err) {
    console.error('[bumpcfg]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${e('btn_error')} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

// ── Modal submit ──────────────────────────────────────────────────────────────

async function handleBumpConfigModal(interaction) {
  if (!ensureManageGuild(interaction)) return;

  const current = storage.getConfig(interaction.guild.id) || {
    channel_id: null, role_id: null, custom_message: null, enabled: 0,
  };

  const newMsg = interaction.fields.getTextInputValue('custom_msg').trim() || null;
  storage.setConfig(interaction.guild.id, { ...current, custom_message: newMsg });

  return refreshPanel(interaction);
}

module.exports = {
  handleBumpConfigInteraction,
  handleBumpConfigModal,
};
