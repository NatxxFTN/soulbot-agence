'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { renderTicketPanel, renderTicketAdvancedPanel } = require('../panels/ticket-panel');
const { buildModal } = require('../components/modals');
const { getTicketConfig, updateTicketConfig, resetTicketField } = require('../../core/ticket-helper');
const { EMOJIS } = require('../theme');

function safeStr(val, maxLen = 3900) {
  if (val == null) return '';
  let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return s.length > maxLen ? s.substring(0, maxLen) : s;
}

async function handleTicketInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: `${EMOJIS.cross()} Tu dois être administrateur du serveur.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const customId = interaction.customId;
  const guildId  = interaction.guild.id;
  const action   = customId.split(':').slice(1).join(':'); // tout après 'ticket:'

  try {

    // ── Toggle activation ──────────────────────────────────────────────────
    if (action === 'toggle') {
      const cfg       = getTicketConfig(guildId) || {};
      const wasActive = !!cfg.enabled;
      if (!wasActive) {
        const missing = [];
        if (!cfg.category_id)    missing.push('Catégorie');
        if (!cfg.log_channel_id) missing.push('Salon logs');
        if (!cfg.staff_role_id)  missing.push('Rôle staff');
        if (missing.length > 0) {
          return interaction.reply({
            content: `${EMOJIS.warning()} Configure d'abord : ${missing.map(m => `**${m}**`).join(', ')}.`,
            flags  : MessageFlags.Ephemeral,
          });
        }
      }
      updateTicketConfig(guildId, { enabled: wasActive ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }

    // ── Catégorie ──────────────────────────────────────────────────────────
    if (action === 'category') {
      updateTicketConfig(guildId, { category_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }
    if (action === 'category_reset') {
      resetTicketField(guildId, 'category_id', interaction.user.id);
      updateTicketConfig(guildId, { enabled: 0 }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }

    // ── Salon logs ─────────────────────────────────────────────────────────
    if (action === 'logs') {
      updateTicketConfig(guildId, { log_channel_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }
    if (action === 'logs_reset') {
      resetTicketField(guildId, 'log_channel_id', interaction.user.id);
      updateTicketConfig(guildId, { enabled: 0 }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }

    // ── Rôle staff ─────────────────────────────────────────────────────────
    if (action === 'staff') {
      updateTicketConfig(guildId, { staff_role_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }
    if (action === 'staff_reset') {
      resetTicketField(guildId, 'staff_role_id', interaction.user.id);
      updateTicketConfig(guildId, { enabled: 0 }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }

    // ── Message d'ouverture ────────────────────────────────────────────────
    if (action === 'open_message_modal') {
      const cfg = getTicketConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'ticket:open_message_save',
        title   : "Message d'ouverture",
        inputs  : [{
          id         : 'message',
          label      : "Message d'ouverture",
          paragraph  : true,
          maxLength  : 2000,
          required   : true,
          value      : safeStr(cfg.open_message, 2000),
          placeholder: 'Bienvenue {user} ! Un staff va te répondre.',
        }],
      }));
    }
    if (action === 'open_message_save') {
      updateTicketConfig(guildId, { open_message: interaction.fields.getTextInputValue('message') }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }
    if (action === 'open_message_reset') {
      resetTicketField(guildId, 'open_message', interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }

    // ── Embed d'ouverture ──────────────────────────────────────────────────
    if (action === 'open_embed_modal') {
      const cfg = getTicketConfig(guildId) || {};
      let saved = {};
      try { saved = JSON.parse(cfg.open_embed || '{}'); } catch { saved = {}; }
      return interaction.showModal(buildModal({
        customId: 'ticket:open_embed_save',
        title   : "Embed d'ouverture",
        inputs  : [
          { id: 'title',       label: 'Titre',       required: false, maxLength: 256,  value: safeStr(saved.title,       256)  },
          { id: 'description', label: 'Description', required: true,  maxLength: 2000, paragraph: true, value: safeStr(saved.description, 2000), placeholder: 'Bienvenue {user}, décris ton problème...' },
          { id: 'color',       label: 'Couleur hex', required: false, maxLength: 7,    value: safeStr(saved.color,       7),    placeholder: 'F39C12' },
        ],
      }));
    }
    if (action === 'open_embed_save') {
      const embed = {
        title      : interaction.fields.getTextInputValue('title'),
        description: interaction.fields.getTextInputValue('description'),
        color      : interaction.fields.getTextInputValue('color'),
      };
      updateTicketConfig(guildId, { open_embed: JSON.stringify(embed) }, interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }
    if (action === 'open_embed_reset') {
      resetTicketField(guildId, 'open_embed', interaction.user.id);
      return interaction.update(renderTicketPanel(guildId));
    }

    // ── Navigation avancé ↔ principal ──────────────────────────────────────
    if (action === 'advanced') {
      return interaction.update(renderTicketAdvancedPanel(guildId));
    }
    if (action === 'back_main') {
      return interaction.update(renderTicketPanel(guildId));
    }

    // ── Variables (aide éphémère) ──────────────────────────────────────────
    if (action === 'variables') {
      return interaction.reply({
        content:
          `🔍 **Variables disponibles**\n\n` +
          `\`{user}\` — mention du membre\n` +
          `\`{username}\` — nom du membre\n` +
          `\`{server}\` — nom du serveur\n` +
          `\`{ticket}\` — salon du ticket\n` +
          `\`{staff}\` — mention du rôle staff\n\n` +
          `**Exemple :** \`Bienvenue {user} ! {staff} va te répondre.\``,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── AVANCÉ — Message de fermeture ──────────────────────────────────────
    if (action === 'close_message_modal') {
      const cfg = getTicketConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'ticket:close_message_save',
        title   : 'Message de fermeture',
        inputs  : [{
          id         : 'message',
          label      : 'Message de fermeture',
          paragraph  : true,
          maxLength  : 2000,
          required   : true,
          value      : safeStr(cfg.close_message, 2000),
          placeholder: 'Ce ticket va être fermé dans 10 secondes...',
        }],
      }));
    }
    if (action === 'close_message_save') {
      updateTicketConfig(guildId, { close_message: interaction.fields.getTextInputValue('message') }, interaction.user.id);
      return interaction.update(renderTicketAdvancedPanel(guildId));
    }
    if (action === 'close_message_reset') {
      resetTicketField(guildId, 'close_message', interaction.user.id);
      return interaction.update(renderTicketAdvancedPanel(guildId));
    }

    // ── AVANCÉ — Embed de fermeture ────────────────────────────────────────
    if (action === 'close_embed_modal') {
      const cfg = getTicketConfig(guildId) || {};
      let saved = {};
      try { saved = JSON.parse(cfg.close_embed || '{}'); } catch { saved = {}; }
      return interaction.showModal(buildModal({
        customId: 'ticket:close_embed_save',
        title   : 'Embed de fermeture',
        inputs  : [
          { id: 'title',       label: 'Titre',       required: false, maxLength: 256,  value: safeStr(saved.title,       256)  },
          { id: 'description', label: 'Description', required: true,  maxLength: 2000, paragraph: true, value: safeStr(saved.description, 2000) },
          { id: 'color',       label: 'Couleur hex', required: false, maxLength: 7,    value: safeStr(saved.color,       7),    placeholder: 'F39C12' },
        ],
      }));
    }
    if (action === 'close_embed_save') {
      const embed = {
        title      : interaction.fields.getTextInputValue('title'),
        description: interaction.fields.getTextInputValue('description'),
        color      : interaction.fields.getTextInputValue('color'),
      };
      updateTicketConfig(guildId, { close_embed: JSON.stringify(embed) }, interaction.user.id);
      return interaction.update(renderTicketAdvancedPanel(guildId));
    }
    if (action === 'close_embed_reset') {
      resetTicketField(guildId, 'close_embed', interaction.user.id);
      return interaction.update(renderTicketAdvancedPanel(guildId));
    }

    // ── AVANCÉ — Transcript toggle ─────────────────────────────────────────
    if (action === 'transcript_toggle') {
      const cfg = getTicketConfig(guildId) || {};
      updateTicketConfig(guildId, { transcript_enabled: cfg.transcript_enabled !== 0 ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderTicketAdvancedPanel(guildId));
    }

    // ── AVANCÉ — Max par user ──────────────────────────────────────────────
    if (action === 'max_user_modal') {
      const cfg = getTicketConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'ticket:max_user_save',
        title   : 'Max tickets par utilisateur',
        inputs  : [{
          id         : 'max',
          label      : 'Nombre maximum (1-10)',
          paragraph  : false,
          maxLength  : 2,
          required   : true,
          value      : String(cfg.max_per_user ?? 1),
          placeholder: '1',
        }],
      }));
    }
    if (action === 'max_user_save') {
      const val = parseInt(interaction.fields.getTextInputValue('max'), 10);
      if (isNaN(val) || val < 1 || val > 10) {
        return interaction.reply({
          content: `${EMOJIS.cross()} La limite doit être un nombre entre **1** et **10**.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      updateTicketConfig(guildId, { max_per_user: val }, interaction.user.id);
      return interaction.update(renderTicketAdvancedPanel(guildId));
    }

    // ── AVANCÉ — Cooldown ──────────────────────────────────────────────────
    if (action === 'cooldown_modal') {
      const cfg = getTicketConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'ticket:cooldown_save',
        title   : 'Cooldown entre tickets',
        inputs  : [{
          id         : 'cooldown',
          label      : 'Secondes (0 = aucun, max 3600)',
          paragraph  : false,
          maxLength  : 4,
          required   : true,
          value      : String(cfg.cooldown_seconds ?? 0),
          placeholder: '0',
        }],
      }));
    }
    if (action === 'cooldown_save') {
      const val = parseInt(interaction.fields.getTextInputValue('cooldown'), 10);
      if (isNaN(val) || val < 0 || val > 3600) {
        return interaction.reply({
          content: `${EMOJIS.cross()} Le cooldown doit être entre **0** et **3600** secondes.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      updateTicketConfig(guildId, { cooldown_seconds: val }, interaction.user.id);
      return interaction.update(renderTicketAdvancedPanel(guildId));
    }

  } catch (err) {
    console.error('[ticket-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${EMOJIS.cross()} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('ticket', (i) => handleTicketInteraction(i));
  client.selectHandlers.set('ticket', (i) => handleTicketInteraction(i));
  client.modalHandlers .set('ticket', (i) => handleTicketInteraction(i));
}

module.exports = { handleTicketInteraction, register };
