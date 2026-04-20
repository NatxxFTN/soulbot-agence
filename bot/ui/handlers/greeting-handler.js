'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { renderPanel } = require('../panels/greeting-panel');
const { buildModal }  = require('../components/modals');
const { updateConfig, getConfig } = require('../../core/greeting-helper');
const { EMOJIS } = require('../theme');

async function handleGreetingInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: `${EMOJIS.cross()} Tu dois être administrateur du serveur.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const customId = interaction.customId;
  const guildId  = interaction.guild.id;
  // Pattern : greeting:<mode>:<action>
  const parts  = customId.split(':');
  const mode   = parts[1]; // 'join' | 'leave' | 'mode'
  const action = parts[2];

  try {
    // ── Dropdown sélection mode ──────────────────────────────────────────────
    if (customId === 'greeting:mode:select') {
      return interaction.update(renderPanel(guildId, interaction.values[0]));
    }

    // ── Sélection salon ──────────────────────────────────────────────────────
    if (action === 'channel') {
      const field = mode === 'join' ? 'join_channel_id' : 'leave_channel_id';
      updateConfig(guildId, { [field]: interaction.values[0] });
      return interaction.update(renderPanel(guildId, mode));
    }

    // ── Toggle activer / désactiver ──────────────────────────────────────────
    if (action === 'toggle') {
      const cfg         = getConfig(guildId) || {};
      const channelKey  = mode === 'join' ? 'join_channel_id'  : 'leave_channel_id';
      const enabledKey  = mode === 'join' ? 'join_enabled'     : 'leave_enabled';
      if (!cfg[channelKey] && !cfg[enabledKey]) {
        return interaction.reply({
          content: `${EMOJIS.warning()} Définis d'abord un salon avant d'activer.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      updateConfig(guildId, { [enabledKey]: cfg[enabledKey] ? 0 : 1 });
      return interaction.update(renderPanel(guildId, mode));
    }

    // ── Ouverture modals ─────────────────────────────────────────────────────
    if (action === 'message_modal') {
      const cfg = getConfig(guildId) || {};
      const key = mode === 'join' ? 'join_message' : 'leave_message';
      return interaction.showModal(buildModal({
        customId: `greeting:${mode}:message_save`,
        title   : mode === 'join' ? 'Message d\'arrivée' : 'Message de départ',
        inputs  : [{
          id         : 'message',
          label      : 'Message (variables : {user}, {username}, {server}, {count})',
          paragraph  : true,
          placeholder: mode === 'join' ? 'Bienvenue {user} sur **{server}** ! 🎉' : '{username} a quitté **{server}**. 👋',
          value      : cfg[key] || '',
          maxLength  : 1000,
          required   : true,
        }],
      }));
    }

    if (action === 'embed_modal') {
      const cfg = getConfig(guildId) || {};
      const raw = cfg[mode === 'join' ? 'join_embed' : 'leave_embed'];
      const saved = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
      return interaction.showModal(buildModal({
        customId: `greeting:${mode}:embed_save`,
        title   : mode === 'join' ? 'Embed arrivée' : 'Embed départ',
        inputs  : [
          { id: 'title',       label: 'Titre',       placeholder: 'Bienvenue !',                required: false, maxLength: 256,  value: saved.title       || '' },
          { id: 'description', label: 'Description', placeholder: 'Tu es le {count}ème membre !', required: true,  maxLength: 2000, paragraph: true, value: saved.description || '' },
          { id: 'color',       label: 'Couleur hex', placeholder: 'F39C12',                     required: false, maxLength: 7,    value: saved.color       || '' },
        ],
      }));
    }

    if (action === 'dm_modal') {
      const cfg = getConfig(guildId) || {};
      const key = mode === 'join' ? 'join_dm' : 'leave_dm';
      return interaction.showModal(buildModal({
        customId: `greeting:${mode}:dm_save`,
        title   : mode === 'join' ? 'DM arrivée' : 'DM départ',
        inputs  : [{
          id         : 'dm',
          label      : 'Message DM',
          paragraph  : true,
          placeholder: 'Salut {username}, bienvenue sur **{server}** !',
          value      : cfg[key] || '',
          maxLength  : 1000,
          required   : true,
        }],
      }));
    }

    if (action === 'dm_embed_modal') {
      const cfg = getConfig(guildId) || {};
      const raw = cfg[mode === 'join' ? 'join_dm_embed' : 'leave_dm_embed'];
      const saved = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
      return interaction.showModal(buildModal({
        customId: `greeting:${mode}:dm_embed_save`,
        title   : `Embed DM ${mode === 'join' ? 'arrivée' : 'départ'}`,
        inputs  : [
          { id: 'title',       label: 'Titre',       required: false, maxLength: 256,  value: saved.title       || '' },
          { id: 'description', label: 'Description', required: true,  maxLength: 2000, paragraph: true, value: saved.description || '' },
          { id: 'color',       label: 'Couleur hex', placeholder: 'F39C12', required: false, maxLength: 7, value: saved.color || '' },
        ],
      }));
    }

    // ── Soumissions modals ───────────────────────────────────────────────────
    if (action === 'message_save') {
      const key = mode === 'join' ? 'join_message' : 'leave_message';
      updateConfig(guildId, { [key]: interaction.fields.getTextInputValue('message') });
      return interaction.update(renderPanel(guildId, mode));
    }

    if (action === 'embed_save') {
      const key = mode === 'join' ? 'join_embed' : 'leave_embed';
      updateConfig(guildId, { [key]: JSON.stringify({
        title      : interaction.fields.getTextInputValue('title'),
        description: interaction.fields.getTextInputValue('description'),
        color      : interaction.fields.getTextInputValue('color'),
      }) });
      return interaction.update(renderPanel(guildId, mode));
    }

    if (action === 'dm_save') {
      const key = mode === 'join' ? 'join_dm' : 'leave_dm';
      updateConfig(guildId, { [key]: interaction.fields.getTextInputValue('dm') });
      return interaction.update(renderPanel(guildId, mode));
    }

    if (action === 'dm_embed_save') {
      const key = mode === 'join' ? 'join_dm_embed' : 'leave_dm_embed';
      updateConfig(guildId, { [key]: JSON.stringify({
        title      : interaction.fields.getTextInputValue('title'),
        description: interaction.fields.getTextInputValue('description'),
        color      : interaction.fields.getTextInputValue('color'),
      }) });
      return interaction.update(renderPanel(guildId, mode));
    }

    // ── Resets individuels ───────────────────────────────────────────────────
    const resetMap = {
      message_reset : mode === 'join' ? 'join_message'  : 'leave_message',
      embed_reset   : mode === 'join' ? 'join_embed'    : 'leave_embed',
      dm_reset      : mode === 'join' ? 'join_dm'       : 'leave_dm',
      dm_embed_reset: mode === 'join' ? 'join_dm_embed' : 'leave_dm_embed',
    };
    if (resetMap[action] !== undefined) {
      updateConfig(guildId, { [resetMap[action]]: null });
      return interaction.update(renderPanel(guildId, mode));
    }

    // ── Variables (aide éphémère) ────────────────────────────────────────────
    if (action === 'variables') {
      return interaction.reply({
        content:
          `🔍 **Variables disponibles**\n\n` +
          `\`{user}\` — mention du membre\n` +
          `\`{username}\` — nom du membre\n` +
          `\`{server}\` — nom du serveur\n` +
          `\`{count}\` — nombre total de membres\n\n` +
          `**Exemple :** \`Bienvenue {user} sur **{server}** ! Tu es le {count}ème.\``,
        flags: MessageFlags.Ephemeral,
      });
    }

  } catch (err) {
    console.error('[greeting-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${EMOJIS.cross()} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('greeting', (i) => handleGreetingInteraction(i));
  client.selectHandlers.set('greeting', (i) => handleGreetingInteraction(i));
  client.modalHandlers .set('greeting', (i) => handleGreetingInteraction(i));
}

module.exports = { handleGreetingInteraction, register };
