'use strict';

const {
  MessageFlags,
  ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/reminder-storage');
const { parseReminderTime } = require('../../core/reminder-scheduler');

async function handleReminderButton(interaction, params) {
  try {
    const action = params[0];
    if (action === 'open_create') {
      const modal = new ModalBuilder()
        .setCustomId('reminder_modal:create')
        .setTitle('Créer un rappel');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('when')
            .setLabel('Quand ? (ex: dans 2h, dans 30min)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(60)
            .setRequired(true)
            .setPlaceholder('dans 2h'),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('content')
            .setLabel('Contenu du rappel')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1500)
            .setRequired(true)
            .setPlaceholder('Ne pas oublier le build !'),
        ),
      );
      return interaction.showModal(modal).catch(() => {});
    }
  } catch (err) {
    console.error('[reminder-handler] button:', err);
  }
}

async function handleReminderModal(interaction, params, _client) {
  try {
    const action = params[0];
    if (action === 'create') {
      const when = interaction.fields.getTextInputValue('when').trim();
      const content = interaction.fields.getTextInputValue('content').trim();

      const ts = parseReminderTime(when);
      if (!ts) {
        return interaction.reply({
          content: `${e('btn_error')} Temps invalide : \`${when}\`. Exemples : \`dans 30min\`, \`dans 2h\`.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      if (!content) {
        return interaction.reply({
          content: `${e('btn_error')} Contenu manquant.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const id = storage.createReminder({
        guild_id: interaction.guild.id,
        channel_id: interaction.channel.id,
        message_content: content,
        trigger_at: ts,
        created_by: interaction.user.id,
      });

      if (!id) {
        return interaction.reply({
          content: `${e('btn_error')} Erreur lors de la création.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      return interaction.reply({
        content: `${e('btn_success')} Rappel **#${id}** programmé <t:${Math.floor(ts / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[reminder-handler] modal:', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

module.exports = {
  handleReminderButton,
  handleReminderModal,
};
