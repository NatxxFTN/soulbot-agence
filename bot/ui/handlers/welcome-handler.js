'use strict';

const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const { renderWelcomePanel, renderEmbedPanel, renderFieldsPanel } = require('../panels/welcome-panel');
const {
  getWelcomeConfig, updateWelcomeConfig,
  getFields, addField, updateField, removeField,
  validateImageUrl, validateColor, buildWelcomeMessage,
} = require('../../core/welcome-helper');

// ─── Modal factory helpers ────────────────────────────────────────────────────

function shortModal(customId, title, inputId, label, placeholder = '', value = '', required = true) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(inputId)
        .setLabel(label)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(placeholder)
        .setValue(value || '')
        .setRequired(required)
        .setMaxLength(256),
    ),
  );
  return modal;
}

function paragraphModal(customId, title, inputId, label, placeholder = '', value = '') {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(inputId)
        .setLabel(label)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(placeholder)
        .setValue(value || '')
        .setRequired(false)
        .setMaxLength(2000),
    ),
  );
  return modal;
}

// ─── Guard Admin ──────────────────────────────────────────────────────────────

function isAdmin(interaction) {
  return interaction.member?.permissions?.has('Administrator');
}

// ─── Handler principal ────────────────────────────────────────────────────────

async function handleWelcomeInteraction(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: '✗ Administrateur requis.', flags: MessageFlags.Ephemeral });
  }

  const id      = interaction.customId;
  const guildId = interaction.guild.id;

  try {

    // ── Toggle activation ────────────────────────────────────────────────────
    if (id === 'welcome:toggle') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { enabled: cfg.enabled ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }

    // ── Sélection mode ───────────────────────────────────────────────────────
    if (id === 'welcome:mode') {
      updateWelcomeConfig(guildId, { mode: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }

    // ── Salon sélection ──────────────────────────────────────────────────────
    if (id === 'welcome:channel') {
      updateWelcomeConfig(guildId, { channel_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }
    if (id === 'welcome:channel_reset') {
      updateWelcomeConfig(guildId, { channel_id: null }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }

    // ── Rôle auto ────────────────────────────────────────────────────────────
    if (id === 'welcome:role') {
      updateWelcomeConfig(guildId, { auto_role_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }
    if (id === 'welcome:role_reset') {
      updateWelcomeConfig(guildId, { auto_role_id: null }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }

    // ── Texte — modal ────────────────────────────────────────────────────────
    if (id === 'welcome:text_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        paragraphModal('welcome:text_submit', 'Message texte', 'text',
          'Texte de bienvenue', 'Bienvenue {mention} sur {server} !', cfg.text_content),
      );
    }
    if (id === 'welcome:text_submit') {
      const text = interaction.fields.getTextInputValue('text').trim();
      updateWelcomeConfig(guildId, { text_content: text || null }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }

    // ── Navigation sous-panels ───────────────────────────────────────────────
    if (id === 'welcome:embed_panel')  return interaction.update(renderEmbedPanel(guildId));
    if (id === 'welcome:fields_panel') return interaction.update(renderFieldsPanel(guildId));
    if (id === 'welcome:back_main')    return interaction.update(renderWelcomePanel(guildId));

    // ── Embed : titre ────────────────────────────────────────────────────────
    if (id === 'welcome:embed_title_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_title_submit', 'Titre de l\'embed', 'value',
          'Titre (max 256)', 'Bienvenue sur {server} !', cfg.embed_title, false),
      );
    }
    if (id === 'welcome:embed_title_submit') {
      const v = interaction.fields.getTextInputValue('value').trim();
      updateWelcomeConfig(guildId, { embed_title: v || null }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : description ──────────────────────────────────────────────────
    if (id === 'welcome:embed_desc_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      const modal = new ModalBuilder().setCustomId('welcome:embed_desc_submit').setTitle('Description de l\'embed');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('value')
            .setLabel('Description (max 4096)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Contenu de l\'embed. Variables : {mention}, {server}…')
            .setValue(cfg.embed_description || '')
            .setRequired(false)
            .setMaxLength(4000),
        ),
      );
      return interaction.showModal(modal);
    }
    if (id === 'welcome:embed_desc_submit') {
      const v = interaction.fields.getTextInputValue('value').trim();
      updateWelcomeConfig(guildId, { embed_description: v || null }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : couleur ──────────────────────────────────────────────────────
    if (id === 'welcome:embed_color_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_color_submit', 'Couleur de l\'embed', 'value',
          'Couleur hex (ex: #F39C12)', '#F39C12', cfg.embed_color || '#F39C12'),
      );
    }
    if (id === 'welcome:embed_color_submit') {
      const v   = interaction.fields.getTextInputValue('value').trim();
      const res = validateColor(v);
      if (!res.valid) {
        return interaction.reply({ content: `✗ ${res.error}`, flags: MessageFlags.Ephemeral });
      }
      updateWelcomeConfig(guildId, { embed_color: res.color }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : URL ──────────────────────────────────────────────────────────
    if (id === 'welcome:embed_url_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_url_submit', 'URL du titre', 'value',
          'URL https://', 'https://...', cfg.embed_url || '', false),
      );
    }
    if (id === 'welcome:embed_url_submit') {
      const v = interaction.fields.getTextInputValue('value').trim();
      updateWelcomeConfig(guildId, { embed_url: v || null }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : thumbnail ────────────────────────────────────────────────────
    if (id === 'welcome:embed_thumb_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_thumb_submit', 'Thumbnail', 'value',
          'URL, "user_avatar" ou "server_icon"', 'user_avatar', cfg.embed_thumbnail_url || '', false),
      );
    }
    if (id === 'welcome:embed_thumb_submit') {
      const v   = interaction.fields.getTextInputValue('value').trim();
      const res = validateImageUrl(v);
      if (!res.valid) return interaction.reply({ content: `✗ ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, { embed_thumbnail_url: res.url }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : image principale ─────────────────────────────────────────────
    if (id === 'welcome:embed_image_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_image_submit', 'Image principale', 'value',
          'URL https://', 'https://...', cfg.embed_image_url || '', false),
      );
    }
    if (id === 'welcome:embed_image_submit') {
      const v   = interaction.fields.getTextInputValue('value').trim();
      const res = validateImageUrl(v);
      if (!res.valid) return interaction.reply({ content: `✗ ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, { embed_image_url: res.url }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : author name ──────────────────────────────────────────────────
    if (id === 'welcome:embed_author_name_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_author_name_submit', 'Author nom', 'value',
          'Nom de l\'author', '{server}', cfg.embed_author_name || '', false),
      );
    }
    if (id === 'welcome:embed_author_name_submit') {
      const v = interaction.fields.getTextInputValue('value').trim();
      updateWelcomeConfig(guildId, { embed_author_name: v || null }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : author icon ──────────────────────────────────────────────────
    if (id === 'welcome:embed_author_icon_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_author_icon_submit', 'Author icône', 'value',
          'URL, "user_avatar" ou "server_icon"', 'server_icon', cfg.embed_author_icon || '', false),
      );
    }
    if (id === 'welcome:embed_author_icon_submit') {
      const v   = interaction.fields.getTextInputValue('value').trim();
      const res = validateImageUrl(v);
      if (!res.valid) return interaction.reply({ content: `✗ ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, { embed_author_icon: res.url }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : author URL ───────────────────────────────────────────────────
    if (id === 'welcome:embed_author_url_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_author_url_submit', 'Author URL', 'value',
          'https://...', 'https://...', cfg.embed_author_url || '', false),
      );
    }
    if (id === 'welcome:embed_author_url_submit') {
      const v = interaction.fields.getTextInputValue('value').trim();
      updateWelcomeConfig(guildId, { embed_author_url: v || null }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : footer texte ─────────────────────────────────────────────────
    if (id === 'welcome:embed_footer_text_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_footer_text_submit', 'Footer texte', 'value',
          'Texte du footer (max 256)', '{server} · {membercount} membres', cfg.embed_footer_text || '', false),
      );
    }
    if (id === 'welcome:embed_footer_text_submit') {
      const v = interaction.fields.getTextInputValue('value').trim();
      updateWelcomeConfig(guildId, { embed_footer_text: v || null }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : footer icon ──────────────────────────────────────────────────
    if (id === 'welcome:embed_footer_icon_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:embed_footer_icon_submit', 'Footer icône', 'value',
          'URL, "user_avatar" ou "server_icon"', 'server_icon', cfg.embed_footer_icon || '', false),
      );
    }
    if (id === 'welcome:embed_footer_icon_submit') {
      const v   = interaction.fields.getTextInputValue('value').trim();
      const res = validateImageUrl(v);
      if (!res.valid) return interaction.reply({ content: `✗ ${res.error}`, flags: MessageFlags.Ephemeral });
      updateWelcomeConfig(guildId, { embed_footer_icon: res.url }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Embed : timestamp toggle ─────────────────────────────────────────────
    if (id === 'welcome:embed_timestamp') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { embed_timestamp: cfg.embed_timestamp ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderEmbedPanel(guildId));
    }

    // ── Champs : ajouter ─────────────────────────────────────────────────────
    if (id === 'welcome:field_add_modal') {
      const modal = new ModalBuilder().setCustomId('welcome:field_add_submit').setTitle('Ajouter un champ');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('name').setLabel('Nom (max 256)').setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('value').setLabel('Valeur (max 1024)').setStyle(TextInputStyle.Paragraph).setMaxLength(1024).setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('inline').setLabel('Inline ? (oui/non)').setStyle(TextInputStyle.Short).setPlaceholder('non').setRequired(false),
        ),
      );
      return interaction.showModal(modal);
    }
    if (id === 'welcome:field_add_submit') {
      const name   = interaction.fields.getTextInputValue('name').trim();
      const value  = interaction.fields.getTextInputValue('value').trim();
      const inline = interaction.fields.getTextInputValue('inline').trim().toLowerCase() === 'oui';
      try {
        addField(guildId, name, value, inline);
      } catch (e) {
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
      const modal = new ModalBuilder().setCustomId(`welcome:field_edit_submit:${fieldId}`).setTitle('Modifier le champ');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('name').setLabel('Nom').setStyle(TextInputStyle.Short).setValue(field.name).setMaxLength(256).setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('value').setLabel('Valeur').setStyle(TextInputStyle.Paragraph).setValue(field.value).setMaxLength(1024).setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('inline').setLabel('Inline ? (oui/non)').setStyle(TextInputStyle.Short).setValue(field.inline ? 'oui' : 'non').setRequired(false),
        ),
      );
      return interaction.showModal(modal);
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
      const fieldId = parseInt(id.split(':')[2], 10);
      removeField(fieldId);
      return interaction.update(renderFieldsPanel(guildId));
    }

    // ── DM : toggle ──────────────────────────────────────────────────────────
    if (id === 'welcome:dm_toggle') {
      const cfg = getWelcomeConfig(guildId) || {};
      updateWelcomeConfig(guildId, { dm_enabled: cfg.dm_enabled ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }
    if (id === 'welcome:dm_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        paragraphModal('welcome:dm_submit', 'Message DM', 'text',
          'Message DM', 'Bienvenue sur {server} {user} !', cfg.dm_content),
      );
    }
    if (id === 'welcome:dm_submit') {
      const text = interaction.fields.getTextInputValue('text').trim();
      updateWelcomeConfig(guildId, { dm_content: text || null }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }

    // ── Auto-delete ──────────────────────────────────────────────────────────
    if (id === 'welcome:autodelete_edit') {
      const cfg = getWelcomeConfig(guildId) || {};
      return interaction.showModal(
        shortModal('welcome:autodelete_submit', 'Auto-delete', 'seconds',
          'Secondes (0 = jamais)', '0', String(cfg.auto_delete_seconds || 0)),
      );
    }
    if (id === 'welcome:autodelete_submit') {
      const secs = Math.max(0, parseInt(interaction.fields.getTextInputValue('seconds').trim(), 10) || 0);
      updateWelcomeConfig(guildId, { auto_delete_seconds: secs }, interaction.user.id);
      return interaction.update(renderWelcomePanel(guildId));
    }

    // ── Aperçu (éphémère dans le salon) ──────────────────────────────────────
    if (id === 'welcome:preview') {
      const cfg = getWelcomeConfig(guildId);
      if (!cfg) return interaction.reply({ content: '✗ Aucune configuration.', flags: MessageFlags.Ephemeral });
      const payload = buildWelcomeMessage(cfg, interaction.member);
      if (!payload.content && !payload.embeds?.length) {
        return interaction.reply({ content: '✗ Aucun contenu à afficher. Configure un embed ou un texte.', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }

    // ── Simulation d'arrivée ──────────────────────────────────────────────────
    if (id === 'welcome:simulate') {
      const cfg = getWelcomeConfig(guildId);
      if (!cfg || !cfg.enabled || !cfg.channel_id) {
        return interaction.reply({ content: '✗ Welcomer désactivé ou salon non configuré.', flags: MessageFlags.Ephemeral });
      }
      const channel = interaction.guild.channels.cache.get(cfg.channel_id);
      if (!channel) return interaction.reply({ content: '✗ Salon introuvable.', flags: MessageFlags.Ephemeral });
      const payload = buildWelcomeMessage(cfg, interaction.member);
      if (cfg.mention_user) payload.content = `<@${interaction.user.id}> ${payload.content || ''}`.trim();
      await channel.send(payload);
      return interaction.reply({ content: `✓ Simulation envoyée dans <#${cfg.channel_id}>.`, flags: MessageFlags.Ephemeral });
    }

    // ── Variables ────────────────────────────────────────────────────────────
    if (id === 'welcome:vars') {
      return interaction.reply({
        content:
          '## 📚 Variables disponibles\n' +
          '`{user}` — Nom d\'utilisateur\n' +
          '`{mention}` — Mention @\n' +
          '`{username}` — Nom d\'utilisateur\n' +
          '`{tag}` — Tag complet\n' +
          '`{id}` — ID du membre\n' +
          '`{server}` / `{servername}` — Nom du serveur\n' +
          '`{membercount}` — Nombre de membres\n' +
          '`{account_age}` — Âge du compte en jours\n' +
          '`{account_created}` — Date de création du compte\n' +
          '`{joined_at}` — Date d\'arrivée\n' +
          '`{avatar_url}` — URL avatar du membre\n' +
          '`{server_icon}` — URL icône du serveur\n' +
          '`{random_color}` — Couleur hex aléatoire',
        flags: MessageFlags.Ephemeral,
      });
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
