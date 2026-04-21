'use strict';

const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const {
  renderMainPanel,
  renderEmbedPanel,
  renderFieldsPanel,
  renderAdvancedPanel,
  renderPreviewPanel,
} = require('../panels/welcome-panel');
const {
  getWelcomeConfig, updateWelcomeConfig, resetWelcomeConfig, applyPreset,
  getFields, addField, updateField, removeField,
  getAutoRoles, addAutoRole, removeAutoRole,
  validateImageUrl, validateColor, buildWelcomeMessage,
} = require('../../core/welcome-helper');

// ─── Modal helpers ────────────────────────────────────────────────────────────

function shortInput(id, label, placeholder = '', value = '', required = true) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(id).setLabel(label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(placeholder).setValue(value || '')
      .setRequired(required).setMaxLength(256),
  );
}

function paraInput(id, label, placeholder = '', value = '', maxLength = 2000) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(id).setLabel(label)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(placeholder).setValue(value || '')
      .setRequired(false).setMaxLength(maxLength),
  );
}

function modal(customId, title, ...rows) {
  const m = new ModalBuilder().setCustomId(customId).setTitle(title);
  m.addComponents(...rows);
  return m;
}

// ─── Guard ────────────────────────────────────────────────────────────────────

function isAdmin(interaction) {
  return interaction.member?.permissions?.has('Administrator');
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handleWelcomeInteraction(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: '✗ Administrateur requis.', flags: MessageFlags.Ephemeral });
  }

  const id      = interaction.customId;
  const guildId = interaction.guild.id;

  try {

    // ── Activation / désactivation ────────────────────────────────────────────
    if (id === 'welcome:toggle') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { enabled: cfg.enabled ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Mode ─────────────────────────────────────────────────────────────────
    if (id === 'welcome:mode') {
      updateWelcomeConfig(guildId, { mode: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Mention ───────────────────────────────────────────────────────────────
    if (id === 'welcome:mention_toggle') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { mention_user: cfg.mention_user ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Salon principal ───────────────────────────────────────────────────────
    if (id === 'welcome:channel') {
      updateWelcomeConfig(guildId, { channel_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }
    if (id === 'welcome:channel_reset') {
      updateWelcomeConfig(guildId, { channel_id: null }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Salon secondaire ──────────────────────────────────────────────────────
    if (id === 'welcome:channel2') {
      updateWelcomeConfig(guildId, { secondary_channel_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }
    if (id === 'welcome:channel2_reset') {
      updateWelcomeConfig(guildId, { secondary_channel_id: null }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Rôles auto multiples ──────────────────────────────────────────────────
    if (id === 'welcome:role_add') {
      try {
        addAutoRole(guildId, interaction.values[0]);
      } catch (e) {
        return interaction.reply({ content: `✗ ${e.message}`, flags: MessageFlags.Ephemeral });
      }
      return interaction.update(renderMainPanel(guildId));
    }
    if (id === 'welcome:roles_clear') {
      const roles = getAutoRoles(guildId);
      for (const r of roles) removeAutoRole(guildId, r.role_id);
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Texte ─────────────────────────────────────────────────────────────────
    if (id === 'welcome:text_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:text_submit', 'Message texte',
          paraInput('text', 'Texte de bienvenue', 'Bienvenue {mention} sur {server} !', cfg.text_content),
        ),
      );
    }
    if (id === 'welcome:text_submit') {
      const text = interaction.fields.getTextInputValue('text').trim();
      updateWelcomeConfig(guildId, { text_content: text || null }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }

    // ── DM ────────────────────────────────────────────────────────────────────
    if (id === 'welcome:dm_toggle') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { dm_enabled: cfg.dm_enabled ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }
    if (id === 'welcome:dm_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:dm_submit', 'Message DM',
          paraInput('text', 'Contenu du DM', 'Bienvenue sur {server} {user} !', cfg.dm_content),
        ),
      );
    }
    if (id === 'welcome:dm_submit') {
      const text = interaction.fields.getTextInputValue('text').trim();
      updateWelcomeConfig(guildId, { dm_content: text || null }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }
    if (id === 'welcome:dm_delay_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:dm_delay_submit', 'Délai DM',
          shortInput('seconds', 'Délai en secondes (0 = immédiat)', '0', String(cfg.dm_delay_seconds || 0)),
        ),
      );
    }
    if (id === 'welcome:dm_delay_submit') {
      const secs = Math.max(0, parseInt(interaction.fields.getTextInputValue('seconds').trim(), 10) || 0);
      updateWelcomeConfig(guildId, { dm_delay_seconds: secs }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Auto-delete ───────────────────────────────────────────────────────────
    if (id === 'welcome:autodelete_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:autodelete_submit', 'Auto-delete',
          shortInput('seconds', 'Secondes (0 = jamais)', '0', String(cfg.auto_delete_seconds || 0)),
        ),
      );
    }
    if (id === 'welcome:autodelete_submit') {
      const secs = Math.max(0, parseInt(interaction.fields.getTextInputValue('seconds').trim(), 10) || 0);
      updateWelcomeConfig(guildId, { auto_delete_seconds: secs }, interaction.user.id);
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Presets ───────────────────────────────────────────────────────────────
    if (id === 'welcome:preset') {
      try {
        applyPreset(guildId, interaction.values[0], interaction.user.id);
      } catch (e) {
        return interaction.reply({ content: `✗ ${e.message}`, flags: MessageFlags.Ephemeral });
      }
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Reset ─────────────────────────────────────────────────────────────────
    if (id === 'welcome:reset_confirm') {
      resetWelcomeConfig(guildId);
      return interaction.update(renderMainPanel(guildId));
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    if (id === 'welcome:embed_panel')    return interaction.update(renderEmbedPanel(guildId));
    if (id === 'welcome:fields_panel')   return interaction.update(renderFieldsPanel(guildId));
    if (id === 'welcome:advanced_panel') return interaction.update(renderAdvancedPanel(guildId));
    if (id === 'welcome:preview_panel')  return interaction.update(renderPreviewPanel(guildId));
    if (id === 'welcome:back_main')      return interaction.update(renderMainPanel(guildId));

    // ── Embed : titre + url titre ─────────────────────────────────────────────
    if (id === 'welcome:embed_title_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:embed_title_submit', 'Titre & URL',
          shortInput('title', 'Titre (max 256)', 'Bienvenue sur {server} !', cfg.embed_title, false),
          shortInput('url',   'URL du titre (optionnel)', 'https://...', cfg.embed_title_url || '', false),
        ),
      );
    }
    if (id === 'welcome:embed_title_submit') {
      const t = interaction.fields.getTextInputValue('title').trim();
      const u = interaction.fields.getTextInputValue('url').trim();
      updateWelcomeConfig(guildId, { embed_title: t || null, embed_title_url: u || null }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : description ───────────────────────────────────────────────────
    if (id === 'welcome:embed_desc_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:embed_desc_submit', 'Description',
          paraInput('value', 'Description (max 4096)', 'Contenu… Variables : {mention}, {server}…', cfg.embed_description, 4000),
        ),
      );
    }
    if (id === 'welcome:embed_desc_submit') {
      const v = interaction.fields.getTextInputValue('value').trim();
      updateWelcomeConfig(guildId, { embed_description: v || null }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : couleur ───────────────────────────────────────────────────────
    if (id === 'welcome:embed_color_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:embed_color_submit', 'Couleur',
          shortInput('value', 'Hex, nom (orange/red…) ou "random"', '#F39C12', cfg.embed_color || '#F39C12'),
        ),
      );
    }
    if (id === 'welcome:embed_color_submit') {
      const v   = interaction.fields.getTextInputValue('value').trim();
      const res = validateColor(v);
      if (!res.valid) return interaction.reply({ content: `✗ ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, { embed_color: res.color }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : thumbnail source + URL ────────────────────────────────────────
    if (id === 'welcome:embed_thumb_src') {
      updateWelcomeConfig(guildId, { embed_thumbnail_source: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }
    if (id === 'welcome:embed_thumb_url_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:embed_thumb_url_submit', 'Thumbnail — URL custom',
          shortInput('url', 'URL https:// (si source = custom)', 'https://...', cfg.embed_thumbnail_url || '', false),
        ),
      );
    }
    if (id === 'welcome:embed_thumb_url_submit') {
      const v   = interaction.fields.getTextInputValue('url').trim();
      const res = validateImageUrl(v);
      if (!res.valid) return interaction.reply({ content: `✗ ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, { embed_thumbnail_url: res.url }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : image source + URL ────────────────────────────────────────────
    if (id === 'welcome:embed_image_src') {
      updateWelcomeConfig(guildId, { embed_image_source: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }
    if (id === 'welcome:embed_image_url_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:embed_image_url_submit', 'Image principale — URL custom',
          shortInput('url', 'URL https:// (si source = custom)', 'https://...', cfg.embed_image_url || '', false),
        ),
      );
    }
    if (id === 'welcome:embed_image_url_submit') {
      const v   = interaction.fields.getTextInputValue('url').trim();
      const res = validateImageUrl(v);
      if (!res.valid) return interaction.reply({ content: `✗ ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, { embed_image_url: res.url }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : author (nom + url) ────────────────────────────────────────────
    if (id === 'welcome:embed_author_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:embed_author_submit', 'Author',
          shortInput('name', 'Nom (max 256)', '{server}',     cfg.embed_author_name  || '', false),
          shortInput('url',  'URL author',    'https://...', cfg.embed_author_url   || '', false),
          shortInput('icon', 'URL icône custom (si source=custom)', 'https://...', cfg.embed_author_icon || '', false),
        ),
      );
    }
    if (id === 'welcome:embed_author_submit') {
      const name = interaction.fields.getTextInputValue('name').trim();
      const url  = interaction.fields.getTextInputValue('url').trim();
      const icon = interaction.fields.getTextInputValue('icon').trim();
      const res  = validateImageUrl(icon);
      if (!res.valid) return interaction.reply({ content: `✗ Icône : ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, {
        embed_author_name: name || null,
        embed_author_url:  url  || null,
        embed_author_icon: res.url,
      }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : author icon source ────────────────────────────────────────────
    if (id === 'welcome:embed_author_icon_src') {
      updateWelcomeConfig(guildId, { embed_author_icon_source: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : footer (texte + icône) ────────────────────────────────────────
    if (id === 'welcome:embed_footer_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:embed_footer_submit', 'Footer',
          shortInput('text', 'Texte (max 256)', '{server} · {membercount} membres', cfg.embed_footer_text || '', false),
          shortInput('icon', 'URL icône custom (si source=custom)', 'https://...', cfg.embed_footer_icon || '', false),
        ),
      );
    }
    if (id === 'welcome:embed_footer_submit') {
      const text = interaction.fields.getTextInputValue('text').trim();
      const icon = interaction.fields.getTextInputValue('icon').trim();
      const res  = validateImageUrl(icon);
      if (!res.valid) return interaction.reply({ content: `✗ Icône : ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, {
        embed_footer_text: text || null,
        embed_footer_icon: res.url,
      }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : footer icon source ────────────────────────────────────────────
    if (id === 'welcome:embed_footer_icon_src') {
      updateWelcomeConfig(guildId, { embed_footer_icon_source: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : timestamp ────────────────────────────────────────────────────
    if (id === 'welcome:embed_timestamp') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { embed_timestamp: cfg.embed_timestamp ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Champs : ajouter ─────────────────────────────────────────────────────
    if (id === 'welcome:field_add_modal') {
      return interaction.showModal(
        modal('welcome:field_add_submit', 'Ajouter un champ',
          shortInput('name',   'Nom (max 256)',     'Rôles',  '', true),
          paraInput('value',   'Valeur (max 1024)', 'Contenu…', '', 1024),
          shortInput('inline', 'Inline ? (oui/non)', 'non', 'non', false),
        ),
      );
    }
    if (id === 'welcome:field_add_submit') {
      const name   = interaction.fields.getTextInputValue('name').trim();
      const value  = interaction.fields.getTextInputValue('value').trim();
      const inline = interaction.fields.getTextInputValue('inline').trim().toLowerCase() === 'oui';
      try { addField(guildId, name, value, inline); } catch (e) {
        return interaction.reply({ content: `✗ ${e.message}`, flags: MessageFlags.Ephemeral });
      }
      return interaction.update(renderFieldsPanel(guildId));
    }

    // ── Champs : modifier ────────────────────────────────────────────────────
    if (id.startsWith('welcome:field_edit:')) {
      const fieldId = parseInt(id.split(':')[2], 10);
      const fields  = getFields(guildId);
      const field   = fields.find(f => f.id === fieldId);
      if (!field) return interaction.reply({ content: '✗ Champ introuvable.', flags: MessageFlags.Ephemeral });
      return interaction.showModal(
        modal(`welcome:field_edit_submit:${fieldId}`, 'Modifier le champ',
          shortInput('name',   'Nom',   '',    field.name,               true),
          paraInput('value',   'Valeur', '',   field.value,              1024),
          shortInput('inline', 'Inline ? (oui/non)', 'non', field.inline ? 'oui' : 'non', false),
        ),
      );
    }
    if (id.startsWith('welcome:field_edit_submit:')) {
      const fieldId = parseInt(id.split(':')[2], 10);
      const name    = interaction.fields.getTextInputValue('name').trim();
      const value   = interaction.fields.getTextInputValue('value').trim();
      const inline  = interaction.fields.getTextInputValue('inline').trim().toLowerCase() === 'oui';
      updateField(fieldId, name, value, inline);
      return interaction.update(renderFieldsPanel(guildId));
    }

    // ── Champs : supprimer ───────────────────────────────────────────────────
    if (id.startsWith('welcome:field_remove:')) {
      removeField(parseInt(id.split(':')[2], 10));
      return interaction.update(renderFieldsPanel(guildId));
    }

    // ── Avancé : ignore_bots ──────────────────────────────────────────────────
    if (id === 'welcome:ignore_bots') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { ignore_bots: cfg.ignore_bots ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Avancé : âge minimum ──────────────────────────────────────────────────
    if (id === 'welcome:min_age_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:min_age_submit', 'Âge compte minimum',
          shortInput('days', 'Jours (0 = désactivé)', '0', String(cfg.min_account_age_days || 0)),
        ),
      );
    }
    if (id === 'welcome:min_age_submit') {
      const days = Math.max(0, parseInt(interaction.fields.getTextInputValue('days').trim(), 10) || 0);
      updateWelcomeConfig(guildId, { min_account_age_days: days }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Avancé : cooldown ──────────────────────────────────────────────────────
    if (id === 'welcome:cooldown_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:cooldown_submit', 'Cooldown',
          shortInput('secs', 'Secondes entre deux welcomes (0 = désactivé)', '0', String(cfg.cooldown_seconds || 0)),
        ),
      );
    }
    if (id === 'welcome:cooldown_submit') {
      const secs = Math.max(0, parseInt(interaction.fields.getTextInputValue('secs').trim(), 10) || 0);
      updateWelcomeConfig(guildId, { cooldown_seconds: secs }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Avancé : rôle requis ──────────────────────────────────────────────────
    if (id === 'welcome:require_role') {
      updateWelcomeConfig(guildId, { require_role_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }
    if (id === 'welcome:require_role_reset') {
      updateWelcomeConfig(guildId, { require_role_id: null }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Avancé : plages horaires ──────────────────────────────────────────────
    if (id === 'welcome:hours_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:hours_submit', 'Plages horaires actives',
          shortInput('start', 'Heure début (0-23, vide = désactivé)', '8',  String(cfg.active_hours_start ?? ''), false),
          shortInput('end',   'Heure fin (0-23)',                     '22', String(cfg.active_hours_end   ?? ''), false),
        ),
      );
    }
    if (id === 'welcome:hours_submit') {
      const s = interaction.fields.getTextInputValue('start').trim();
      const e = interaction.fields.getTextInputValue('end').trim();
      const start = s !== '' ? Math.min(23, Math.max(0, parseInt(s, 10) || 0)) : -1;
      const end   = e !== '' ? Math.min(23, Math.max(0, parseInt(e, 10) || 0)) : -1;
      updateWelcomeConfig(guildId, { active_hours_start: start, active_hours_end: end }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Avancé : jours actifs ─────────────────────────────────────────────────
    if (id === 'welcome:weekdays_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        modal('welcome:weekdays_submit', 'Jours actifs',
          shortInput('days', 'Jours (0=dim,1=lun… ex: 1,2,3,4,5), vide = tous', '1,2,3,4,5', cfg.active_weekdays || '', false),
        ),
      );
    }
    if (id === 'welcome:weekdays_submit') {
      const v = interaction.fields.getTextInputValue('days').trim();
      updateWelcomeConfig(guildId, { active_weekdays: v || null }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Avancé : mention then delete ──────────────────────────────────────────
    if (id === 'welcome:mention_then_delete') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { mention_then_delete: cfg.mention_then_delete ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderAdvancedPanel(guildId));
    }

    // ── Aperçu embed (éphémère) ───────────────────────────────────────────────
    if (id === 'welcome:preview') {
      const cfg = getWelcomeConfig(guildId);
      if (!cfg) return interaction.reply({ content: '✗ Aucune configuration.', flags: MessageFlags.Ephemeral });
      const payload = buildWelcomeMessage(cfg, interaction.member);
      if (!payload.content && !payload.embeds?.length) {
        return interaction.reply({ content: '✗ Aucun contenu. Configure un embed ou un texte.', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }

    // ── Simulation d'arrivée ──────────────────────────────────────────────────
    if (id === 'welcome:simulate') {
      const cfg = getWelcomeConfig(guildId);
      if (!cfg || !cfg.channel_id) {
        return interaction.reply({ content: '✗ Salon principal non configuré.', flags: MessageFlags.Ephemeral });
      }
      const channel = interaction.guild.channels.cache.get(cfg.channel_id);
      if (!channel) return interaction.reply({ content: '✗ Salon introuvable.', flags: MessageFlags.Ephemeral });
      const payload = buildWelcomeMessage(cfg, interaction.member);
      if (cfg.mention_user) payload.content = `<@${interaction.user.id}> ${payload.content || ''}`.trim();
      await channel.send(payload);
      return interaction.reply({ content: `✓ Simulation envoyée dans <#${cfg.channel_id}>.`, flags: MessageFlags.Ephemeral });
    }

  } catch (err) {
    console.error('[welcome-handler]', err);
    const msg = { content: `✗ Erreur : ${err.message}`, flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('welcome', (i) => handleWelcomeInteraction(i));
  client.selectHandlers.set('welcome', (i) => handleWelcomeInteraction(i));
  client.modalHandlers .set('welcome', (i) => handleWelcomeInteraction(i));
}

module.exports = { handleWelcomeInteraction, register };
