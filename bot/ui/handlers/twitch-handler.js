'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/twitch-storage');

async function refreshConfig(interaction) {
  const { buildPanel } = require('../../commands/configuration/twitchconfig');
  const { container, rows } = buildPanel(interaction.guild);
  return interaction.update({
    components: [container, ...rows],
    flags: MessageFlags.IsComponentsV2,
  }).catch(() => {});
}

async function handleTwitchInteraction(interaction, params, _client) {
  try {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: `${e('btn_error')} Permission requise.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const action = params[0];
    const guildId = interaction.guild.id;

    if (interaction.isChannelSelectMenu?.() && action === 'set_channel') {
      storage.setConfig(guildId, { channel_id: interaction.values[0] || null });
      return refreshConfig(interaction);
    }
    if (interaction.isRoleSelectMenu?.() && action === 'set_role') {
      storage.setConfig(guildId, { ping_role_id: interaction.values[0] || null });
      return refreshConfig(interaction);
    }
    if (action === 'toggle_enabled') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { enabled: cur.enabled ? 0 : 1 });
      return refreshConfig(interaction);
    }
    if (action === 'edit_template') {
      const cur = storage.getConfig(guildId) || {};
      const modal = new ModalBuilder()
        .setCustomId('twcfg_modal:template')
        .setTitle('Template message live');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('template')
          .setLabel('Variables : {streamer} {title} {url} {game}')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1500)
          .setRequired(true)
          .setValue(cur.message_template || '🔴 **{streamer}** est en LIVE !\n{title}\n{url}'),
      ));
      return interaction.showModal(modal).catch(() => {});
    }
  } catch (err) {
    console.error('[twitch-handler]', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

async function handleTwitchModal(interaction, params, _client) {
  try {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: `${e('btn_error')} Permission requise.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const action = params[0];
    if (action === 'template') {
      const tpl = interaction.fields.getTextInputValue('template').trim();
      if (!tpl) {
        return interaction.reply({
          content: `${e('btn_error')} Template vide.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      storage.setConfig(interaction.guild.id, { message_template: tpl });
      return interaction.reply({
        content: `${e('btn_success')} Template mis à jour.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[twitch-handler] modal:', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

module.exports = {
  handleTwitchInteraction,
  handleTwitchModal,
};
