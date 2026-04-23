'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/bday-storage');

function ephemeralText(interaction, content) {
  return interaction.reply({
    content,
    flags: MessageFlags.Ephemeral,
  }).catch(() => {});
}

async function refreshPanel(interaction) {
  try {
    const { buildPanel } = require('../../commands/configuration/bdayconfig');
    const { container, rows } = buildPanel(interaction.guild);
    return interaction.update({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  } catch (err) {
    console.error('[bday-handler] refreshPanel:', err);
  }
}

async function handleBdayConfigInteraction(interaction, params, _client) {
  try {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return ephemeralText(interaction, `${e('btn_error')} Permission requise.`);
    }
    const action = params[0];
    const guildId = interaction.guild.id;

    if (interaction.isChannelSelectMenu?.() && action === 'set_channel') {
      storage.setConfig(guildId, { announcement_channel: interaction.values[0] || null });
    } else if (interaction.isRoleSelectMenu?.() && action === 'set_role') {
      storage.setConfig(guildId, { role_id: interaction.values[0] || null });
    } else if (action === 'toggle_enabled') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { enabled: cur.enabled ? 0 : 1 });
    } else if (action === 'toggle_ping') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { ping_everyone: cur.ping_everyone ? 0 : 1 });
    } else if (action === 'edit_template') {
      const cur = storage.getConfig(guildId) || {};
      const modal = new ModalBuilder()
        .setCustomId('bdaycfg_modal:template')
        .setTitle('Message d\'anniversaire');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('template')
          .setLabel('Message ({user}, {username}, {server})')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(2000)
          .setRequired(true)
          .setValue((cur.message_template || '').slice(0, 2000))
          .setPlaceholder('🎂 Joyeux anniversaire {user} !'),
      ));
      return interaction.showModal(modal).catch(() => {});
    }

    return refreshPanel(interaction);
  } catch (err) {
    console.error('[bday-handler] config:', err);
    try { await ephemeralText(interaction, `${e('btn_error')} Erreur interne.`); } catch {}
  }
}

async function handleBdayConfigModal(interaction, _params, _client) {
  try {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return ephemeralText(interaction, `${e('btn_error')} Permission requise.`);
    }
    const template = (interaction.fields.getTextInputValue('template') || '').trim();
    if (!template) return ephemeralText(interaction, `${e('btn_error')} Message vide.`);

    storage.setConfig(interaction.guild.id, { message_template: template });
    return ephemeralText(interaction, `${e('btn_success')} Message mis à jour.`);
  } catch (err) {
    console.error('[bday-handler] modal:', err);
    try { await ephemeralText(interaction, `${e('btn_error')} Erreur interne.`); } catch {}
  }
}

module.exports = {
  handleBdayConfigInteraction,
  handleBdayConfigModal,
};
