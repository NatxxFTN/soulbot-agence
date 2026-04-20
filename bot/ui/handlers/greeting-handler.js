'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { renderMainPanel, renderJoinPanel, renderLeavePanel } = require('../panels/greeting-panel');
const { buildModal } = require('../components/modals');
const { updateConfig, getConfig } = require('../../core/greeting-helper');
const { EMOJIS } = require('../theme');

/**
 * Gère toutes les interactions dont le customId commence par "greeting:".
 * Routage via le pattern <panel>:<section>:<action>.
 */
async function handleGreetingInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content  : `${EMOJIS.error} Tu dois être administrateur du serveur.`,
      flags    : MessageFlags.Ephemeral,
    });
  }

  const customId = interaction.customId;
  const guildId  = interaction.guild.id;

  try {
    // ── Navigation sections ──────────────────────────────────────────────────
    if (customId === 'greeting:section:select') {
      const panel = interaction.values[0] === 'join'
        ? renderJoinPanel(guildId)
        : renderLeavePanel(guildId);
      return interaction.update(panel);
    }

    if (customId === 'greeting:back') {
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Toggles ──────────────────────────────────────────────────────────────
    if (customId === 'greeting:join:toggle') {
      const cfg = getConfig(guildId) || {};
      if (!cfg.join_channel_id) {
        return interaction.reply({
          content: `${EMOJIS.warning} Définis d'abord un salon d'arrivée avant d'activer.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      updateConfig(guildId, { join_enabled: cfg.join_enabled ? 0 : 1 });
      return interaction.update(renderJoinPanel(guildId));
    }

    if (customId === 'greeting:leave:toggle') {
      const cfg = getConfig(guildId) || {};
      if (!cfg.leave_channel_id) {
        return interaction.reply({
          content: `${EMOJIS.warning} Définis d'abord un salon de départ avant d'activer.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      updateConfig(guildId, { leave_enabled: cfg.leave_enabled ? 0 : 1 });
      return interaction.update(renderLeavePanel(guildId));
    }

    // ── Sélecteurs de salons ─────────────────────────────────────────────────
    if (customId === 'greeting:join:channel') {
      updateConfig(guildId, { join_channel_id: interaction.values[0] });
      return interaction.update(renderJoinPanel(guildId));
    }

    if (customId === 'greeting:leave:channel') {
      updateConfig(guildId, { leave_channel_id: interaction.values[0] });
      return interaction.update(renderLeavePanel(guildId));
    }

    // ── Resets ───────────────────────────────────────────────────────────────
    if (customId === 'greeting:join:reset') {
      updateConfig(guildId, { join_channel_id: null, join_enabled: 0, join_message: null });
      return interaction.update(renderJoinPanel(guildId));
    }

    if (customId === 'greeting:leave:reset') {
      updateConfig(guildId, { leave_channel_id: null, leave_enabled: 0, leave_message: null });
      return interaction.update(renderLeavePanel(guildId));
    }

    // ── Modals — ouverture ───────────────────────────────────────────────────
    if (customId === 'greeting:join:message_modal') {
      const cfg = getConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'greeting:join:message_save',
        title   : 'Message d\'arrivée',
        inputs  : [{
          id         : 'message',
          label      : 'Message (variables : {user}, {server})',
          paragraph  : true,
          placeholder: 'Bienvenue {user} sur **{server}** ! 🎉',
          value      : cfg.join_message || '',
          maxLength  : 500,
          required   : true,
        }],
      }));
    }

    if (customId === 'greeting:leave:message_modal') {
      const cfg = getConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'greeting:leave:message_save',
        title   : 'Message de départ',
        inputs  : [{
          id         : 'message',
          label      : 'Message (variables : {username}, {server})',
          paragraph  : true,
          placeholder: '{username} a quitté **{server}**. 👋',
          value      : cfg.leave_message || '',
          maxLength  : 500,
          required   : true,
        }],
      }));
    }

    // ── Modals — soumission ──────────────────────────────────────────────────
    if (customId === 'greeting:join:message_save') {
      const msg = interaction.fields.getTextInputValue('message');
      updateConfig(guildId, { join_message: msg });
      return interaction.update(renderJoinPanel(guildId));
    }

    if (customId === 'greeting:leave:message_save') {
      const msg = interaction.fields.getTextInputValue('message');
      updateConfig(guildId, { leave_message: msg });
      return interaction.update(renderLeavePanel(guildId));
    }

  } catch (err) {
    console.error('[greeting-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${EMOJIS.error} Une erreur est survenue.`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

/**
 * Enregistre le handler greeting dans les Maps client (button + select + modal).
 * À appeler depuis bot/index.js après loadCommands.
 */
function register(client) {
  client.buttonHandlers.set('greeting', (interaction) => handleGreetingInteraction(interaction));
  client.selectHandlers.set('greeting', (interaction) => handleGreetingInteraction(interaction));
  client.modalHandlers .set('greeting', (interaction) => handleGreetingInteraction(interaction));
}

module.exports = { handleGreetingInteraction, register };
