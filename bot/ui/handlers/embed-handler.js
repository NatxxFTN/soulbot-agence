'use strict';

// ── Embed Builder — Handler ───────────────────────────────────────────────────
// Gère : boutons (emb:), modals (emb_modal:), select menus (emb_select:)

const {
  MessageFlags,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const { COLORS } = require('../theme');
const {
  getState, updateState, addField, updateField,
  removeField, resetState, deleteState,
} = require('../../core/embed-state');
const { renderEmbedBuilderPanel }   = require('../panels/embed-builder-panel');
const {
  buildTitleModal, buildDescriptionModal, buildAuthorModal,
  buildFooterModal, buildThumbnailModal, buildImageModal,
  buildFieldAddModal, buildFieldEditModal,
  buildColorModal, buildTemplateNameModal, buildTemplateRenameModal,
} = require('../modals/embed-modals');

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPanelPayload(state) {
  return renderEmbedBuilderPanel(state);
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function isEmbedEmpty(state) {
  return !state.embed.title
    && !state.embed.description
    && state.embed.fields.length === 0
    && !state.embed.image
    && !state.embed.thumbnail
    && !state.embed.author
    && !state.embed.footer;
}

function parseInline(val) {
  return ['oui', 'yes', 'true', '1', 'o'].includes((val ?? '').toLowerCase().trim());
}

// ── Boutons ───────────────────────────────────────────────────────────────────

async function handleEmbedInteraction(interaction, params, client) {
  const action = params[0];
  const args   = params.slice(1);

  const state = getState(interaction.user.id);
  if (!state) {
    return interaction.reply({
      content: `${e('btn_error')} Session expirée. Tape \`;embed\` pour recommencer.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  switch (action) {
    case 'title':
      return interaction.showModal(buildTitleModal(state));

    case 'desc':
      return interaction.showModal(buildDescriptionModal(state));

    case 'author':
      return interaction.showModal(buildAuthorModal(state));

    case 'footer':
      return interaction.showModal(buildFooterModal(state));

    case 'thumbnail':
      return interaction.showModal(buildThumbnailModal(state));

    case 'image':
      return interaction.showModal(buildImageModal(state));

    case 'titleurl':
      return interaction.showModal(buildTitleModal(state));

    case 'timestamp': {
      updateState(interaction.user.id, { timestamp: state.embed.timestamp ? null : new Date().toISOString() });
      return interaction.update(buildPanelPayload(state));
    }

    case 'field':
      return handleFieldAction(interaction, state, args, client);

    case 'color':
      return handleColorAction(interaction, state, args, client);

    case 'emojis':
      return handleEmojisAction(interaction, state, args, client);

    case 'tpl':
      return handleTemplateAction(interaction, state, args, client);

    case 'preview': {
      if (isEmbedEmpty(state)) {
        return interaction.reply({ content: `${e('btn_error')} Ton embed est vide.`, flags: MessageFlags.Ephemeral });
      }
      const previewEmb = buildEmbedFromState(state);
      return interaction.reply({ embeds: [previewEmb], flags: MessageFlags.Ephemeral });
    }

    case 'send': {
      if (args[0] === 'here') {
        return executeSend(interaction, state, state.channelId, client);
      }
      if (args[0] === 'back') {
        return interaction.update(buildPanelPayload(state));
      }
      if (isEmbedEmpty(state)) {
        return interaction.reply({ content: `${e('btn_error')} Ton embed est vide.`, flags: MessageFlags.Ephemeral });
      }
      const { renderSendPanel } = require('../panels/embed-send-panel');
      return interaction.update(renderSendPanel(state));
    }

    case 'reset': {
      resetState(interaction.user.id);
      return interaction.update(buildPanelPayload(state));
    }

    case 'close': {
      deleteState(interaction.user.id);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('✓ Session Embed Builder fermée.'),
      );
      return interaction.update({ components: [ct], flags: MessageFlags.IsComponentsV2 });
    }

    default:
      return interaction.reply({
        content: `${e('btn_error')} Action inconnue : \`${action}\`.`,
        flags  : MessageFlags.Ephemeral,
      });
  }
}

// ── Champs ────────────────────────────────────────────────────────────────────

async function handleFieldAction(interaction, state, args, client) {
  const subAction = args[0];

  switch (subAction) {
    case 'add':
      if (state.embed.fields.length >= 25) {
        return interaction.reply({
          content: `${e('btn_error')} Limite de 25 champs atteinte.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      return interaction.showModal(buildFieldAddModal());

    case 'edit':
      if (state.embed.fields.length === 0) {
        return interaction.reply({
          content: `${e('btn_error')} Aucun champ à éditer. Ajoutes-en un d'abord.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      return showFieldSelectMenu(interaction, state, 'edit');

    case 'remove':
      if (state.embed.fields.length === 0) {
        return interaction.reply({
          content: `${e('btn_error')} Aucun champ à supprimer.`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      return showFieldSelectMenu(interaction, state, 'remove');

    default:
      return interaction.reply({
        content: `${e('btn_error')} Action field inconnue.`,
        flags  : MessageFlags.Ephemeral,
      });
  }
}

async function showFieldSelectMenu(interaction, state, mode) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`emb_select:field_${mode}`)
    .setPlaceholder(mode === 'edit' ? 'Champ à éditer' : 'Champ à supprimer')
    .addOptions(
      state.embed.fields.map((f, idx) => ({
        label      : `${idx + 1}. ${f.name.slice(0, 90)}`,
        description: f.value.slice(0, 95),
        value      : String(idx),
      })),
    );

  return interaction.reply({
    content   : mode === 'edit'
      ? `${e('btn_edit')} Quel champ veux-tu éditer ?`
      : `${e('btn_trash')} Quel champ veux-tu supprimer ?`,
    components: [new ActionRowBuilder().addComponents(select)],
    flags     : MessageFlags.Ephemeral,
  });
}

// ── Couleur ───────────────────────────────────────────────────────────────────

async function handleColorAction(interaction, state, args, client) {
  const subAction = args[0];

  if (!subAction) {
    const { renderColorPanel } = require('../panels/embed-color-panel');
    return interaction.update({
      components: [renderColorPanel(state)],
      flags     : MessageFlags.IsComponentsV2,
    });
  }

  if (subAction === 'custom') {
    return interaction.showModal(buildColorModal(state));
  }

  if (subAction === 'none') {
    updateState(interaction.user.id, { color: null });
    return interaction.update(buildPanelPayload(state));
  }

  if (subAction === 'back') {
    return interaction.update(buildPanelPayload(state));
  }
}

// ── Emojis ────────────────────────────────────────────────────────────────────

async function handleEmojisAction(interaction, state, args, client) {
  const subAction = args[0];
  const { renderEmojiPanel } = require('../panels/embed-emoji-panel');

  if (!subAction) {
    return interaction.update({
      components: [renderEmojiPanel(state, interaction.guild, 0)],
      flags     : MessageFlags.IsComponentsV2,
    });
  }

  if (subAction === 'back') {
    return interaction.update(buildPanelPayload(state));
  }

  if (subAction === 'prev' || subAction === 'next') {
    const cur     = parseInt(args[1], 10) || 0;
    const newPage = subAction === 'prev' ? Math.max(0, cur - 1) : cur + 1;
    return interaction.update({
      components: [renderEmojiPanel(state, interaction.guild, newPage)],
      flags     : MessageFlags.IsComponentsV2,
    });
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

async function handleTemplateAction(interaction, state, args, client) {
  const subAction = args[0];
  const storage   = require('../../core/embed-storage');
  const { renderTemplatesPanel } = require('../panels/embed-templates-panel');

  if (!subAction || subAction === 'menu') {
    const userTpls  = storage.listUserTemplates(interaction.user.id);
    const guildTpls = storage.listGuildTemplates(interaction.guild.id);
    return interaction.update({
      components: [renderTemplatesPanel(state, userTpls, guildTpls)],
      flags     : MessageFlags.IsComponentsV2,
    });
  }

  if (subAction === 'back') {
    return interaction.update(buildPanelPayload(state));
  }

  if (subAction === 'save_user') {
    if (isEmbedEmpty(state)) {
      return interaction.reply({ content: `${e('btn_error')} Ton embed est vide.`, flags: MessageFlags.Ephemeral });
    }
    return interaction.showModal(buildTemplateNameModal('user'));
  }

  if (subAction === 'save_guild') {
    if (isEmbedEmpty(state)) {
      return interaction.reply({ content: `${e('btn_error')} Ton embed est vide.`, flags: MessageFlags.Ephemeral });
    }
    return interaction.showModal(buildTemplateNameModal('guild'));
  }

  if (subAction === 'load_menu') {
    const userTpls  = storage.listUserTemplates(interaction.user.id);
    const guildTpls = storage.listGuildTemplates(interaction.guild.id);
    const all       = [...userTpls.map(t => ({ ...t, scope: 'user' })), ...guildTpls.map(t => ({ ...t, scope: 'guild' }))].slice(0, 25);

    if (all.length === 0) {
      return interaction.reply({ content: `${e('btn_error')} Aucun template disponible.`, flags: MessageFlags.Ephemeral });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('emb_select:tpl_load')
      .setPlaceholder('Choisis un template à charger')
      .addOptions(all.map(t => ({
        label      : (t.name ?? t.id).slice(0, 100),
        description: t.scope === 'user' ? 'Personnel' : 'Serveur',
        value      : `${t.scope}:${t.id}`,
      })));

    return interaction.reply({
      content   : `${e('ui_folder')} Charger quel template ?`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags     : MessageFlags.Ephemeral,
    });
  }

  if (subAction === 'delete' || subAction === 'rename') {
    const userTpls  = storage.listUserTemplates(interaction.user.id);
    const guildTpls = storage.listGuildTemplates(interaction.guild.id)
      .filter(t => t.createdBy === interaction.user.id);
    const owned = [
      ...userTpls.map(t => ({ ...t, scope: 'user' })),
      ...guildTpls.map(t => ({ ...t, scope: 'guild' })),
    ].slice(0, 25);

    if (owned.length === 0) {
      return interaction.reply({ content: `${e('btn_error')} Tu n'as aucun template à gérer.`, flags: MessageFlags.Ephemeral });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`emb_select:tpl_${subAction}`)
      .setPlaceholder(subAction === 'delete' ? 'Template à supprimer' : 'Template à renommer')
      .addOptions(owned.map(t => ({
        label      : (t.name ?? t.id).slice(0, 100),
        description: t.scope === 'user' ? 'Personnel' : 'Serveur',
        value      : `${t.scope}:${t.id}`,
      })));

    return interaction.reply({
      content   : subAction === 'delete' ? `${e('btn_trash')} Quel template supprimer ?` : `${e('btn_edit')} Quel template renommer ?`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags     : MessageFlags.Ephemeral,
    });
  }
}

// ── Build embed depuis state ──────────────────────────────────────────────────

function buildEmbedFromState(state) {
  const em  = state.embed;
  const emb = new EmbedBuilder();

  if (em.title)       emb.setTitle(em.title.slice(0, 256));
  if (em.titleUrl)    emb.setURL(em.titleUrl);
  if (em.description) emb.setDescription(em.description.slice(0, 4096));
  if (em.color !== null && em.color !== undefined) emb.setColor(em.color);
  if (em.author?.name) {
    emb.setAuthor({
      name   : em.author.name.slice(0, 256),
      iconURL: em.author.iconUrl || em.author.iconURL || undefined,
      url    : em.author.url || undefined,
    });
  }
  if (em.footer?.text) {
    emb.setFooter({
      text   : em.footer.text.slice(0, 2048),
      iconURL: em.footer.iconUrl || em.footer.iconURL || undefined,
    });
  }
  if (em.thumbnail) emb.setThumbnail(em.thumbnail);
  if (em.image)     emb.setImage(em.image);
  if (em.timestamp) emb.setTimestamp(new Date(em.timestamp));
  if (em.fields.length > 0) {
    emb.addFields(em.fields.slice(0, 25).map(f => ({
      name  : f.name.slice(0, 256),
      value : f.value.slice(0, 1024),
      inline: !!f.inline,
    })));
  }

  return emb;
}

async function executeSend(interaction, state, targetChannelId, client) {
  let channel;
  try {
    channel = await client.channels.fetch(targetChannelId);
  } catch {
    return interaction.reply({ content: `${e('btn_error')} Salon introuvable.`, flags: MessageFlags.Ephemeral });
  }

  if (!channel?.isTextBased()) {
    return interaction.reply({ content: `${e('btn_error')} Ce salon ne peut pas recevoir de messages.`, flags: MessageFlags.Ephemeral });
  }

  try {
    const embed = buildEmbedFromState(state);
    await channel.send({ embeds: [embed] });
    deleteState(interaction.user.id);

    const ct = new ContainerBuilder().setAccentColor(COLORS.accent);
    ct.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`✓ Embed envoyé dans <#${targetChannelId}>.`),
    );
    return interaction.update({ components: [ct], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    return interaction.reply({
      content: `${e('btn_error')} Envoi impossible : ${err.message}`,
      flags  : MessageFlags.Ephemeral,
    });
  }
}

// ── Soumission modals ─────────────────────────────────────────────────────────

async function handleEmbedModalSubmit(interaction, client) {
  if (!interaction.customId?.startsWith('emb_modal:')) return false;

  const state = getState(interaction.user.id);
  if (!state) {
    await interaction.reply({
      content: `${e('btn_error')} Session expirée. Tape \`;embed\` pour recommencer.`,
      flags  : MessageFlags.Ephemeral,
    });
    return true;
  }

  const parts  = interaction.customId.split(':');
  const action = parts[1];
  const args   = parts.slice(2);

  try {
    switch (action) {
      case 'title':      return handleTitleSubmit(interaction, state, client);
      case 'desc':       return handleDescSubmit(interaction, state, client);
      case 'author':     return handleAuthorSubmit(interaction, state, client);
      case 'footer':     return handleFooterSubmit(interaction, state, client);
      case 'thumbnail':  return handleThumbnailSubmit(interaction, state, client);
      case 'image':      return handleImageSubmit(interaction, state, client);
      case 'field_add':  return handleFieldAddSubmit(interaction, state, client);
      case 'field_edit': return handleFieldEditSubmit(interaction, state, args, client);
      case 'color':      return handleColorSubmit(interaction, state, client);
      case 'tpl_save':   return handleTemplateSaveSubmit(interaction, state, args, client);
      case 'tpl_rename': return handleTemplateRenameSubmit(interaction, state, args, client);
      default:           return false;
    }
  } catch (err) {
    console.error('[embed-modal]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${e('btn_error')} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
    return true;
  }
}

// ── Handlers individuels de soumission ────────────────────────────────────────

async function handleTitleSubmit(interaction, state) {
  const title    = interaction.fields.getTextInputValue('title_input').trim() || null;
  const titleUrl = interaction.fields.getTextInputValue('title_url').trim() || null;

  if (title && title.length > 256) {
    return interaction.reply({ content: `${e('btn_error')} Titre trop long (max 256 car.).`, flags: MessageFlags.Ephemeral });
  }
  if (titleUrl && !isValidUrl(titleUrl)) {
    return interaction.reply({ content: `${e('btn_error')} URL du titre invalide (doit commencer par http/https).`, flags: MessageFlags.Ephemeral });
  }

  updateState(interaction.user.id, { title, titleUrl });
  return interaction.update(buildPanelPayload(state));
}

async function handleDescSubmit(interaction, state) {
  const description = interaction.fields.getTextInputValue('desc_input').trim() || null;

  if (description && description.length > 4096) {
    return interaction.reply({ content: `${e('btn_error')} Description trop longue (max 4096 car.).`, flags: MessageFlags.Ephemeral });
  }

  updateState(interaction.user.id, { description });
  return interaction.update(buildPanelPayload(state));
}

async function handleAuthorSubmit(interaction, state) {
  const name    = interaction.fields.getTextInputValue('author_name').trim() || null;
  const iconUrl = interaction.fields.getTextInputValue('author_icon').trim() || null;
  const url     = interaction.fields.getTextInputValue('author_url').trim() || null;

  if (name && name.length > 256) {
    return interaction.reply({ content: `${e('btn_error')} Nom auteur trop long (max 256 car.).`, flags: MessageFlags.Ephemeral });
  }
  if (iconUrl && !isValidUrl(iconUrl)) {
    return interaction.reply({ content: `${e('btn_error')} URL icône auteur invalide.`, flags: MessageFlags.Ephemeral });
  }
  if (url && !isValidUrl(url)) {
    return interaction.reply({ content: `${e('btn_error')} URL auteur invalide.`, flags: MessageFlags.Ephemeral });
  }

  updateState(interaction.user.id, { author: name ? { name, iconUrl, url } : null });
  return interaction.update(buildPanelPayload(state));
}

async function handleFooterSubmit(interaction, state) {
  const text    = interaction.fields.getTextInputValue('footer_text').trim() || null;
  const iconUrl = interaction.fields.getTextInputValue('footer_icon').trim() || null;

  if (text && text.length > 2048) {
    return interaction.reply({ content: `${e('btn_error')} Footer trop long (max 2048 car.).`, flags: MessageFlags.Ephemeral });
  }
  if (iconUrl && !isValidUrl(iconUrl)) {
    return interaction.reply({ content: `${e('btn_error')} URL icône footer invalide.`, flags: MessageFlags.Ephemeral });
  }

  updateState(interaction.user.id, { footer: text ? { text, iconUrl } : null });
  return interaction.update(buildPanelPayload(state));
}

async function handleThumbnailSubmit(interaction, state) {
  const thumbnail = interaction.fields.getTextInputValue('thumbnail_url').trim() || null;

  if (thumbnail && !isValidUrl(thumbnail)) {
    return interaction.reply({ content: `${e('btn_error')} URL miniature invalide.`, flags: MessageFlags.Ephemeral });
  }

  updateState(interaction.user.id, { thumbnail });
  return interaction.update(buildPanelPayload(state));
}

async function handleImageSubmit(interaction, state) {
  const image = interaction.fields.getTextInputValue('image_url').trim() || null;

  if (image && !isValidUrl(image)) {
    return interaction.reply({ content: `${e('btn_error')} URL image invalide.`, flags: MessageFlags.Ephemeral });
  }

  updateState(interaction.user.id, { image });
  return interaction.update(buildPanelPayload(state));
}

async function handleFieldAddSubmit(interaction, state) {
  const name      = interaction.fields.getTextInputValue('field_name').trim();
  const value     = interaction.fields.getTextInputValue('field_value').trim();
  const inlineRaw = interaction.fields.getTextInputValue('field_inline').trim();
  const inline    = parseInline(inlineRaw);

  if (!name)           return interaction.reply({ content: `${e('btn_error')} Nom du champ obligatoire.`, flags: MessageFlags.Ephemeral });
  if (name.length > 256)  return interaction.reply({ content: `${e('btn_error')} Nom trop long (max 256).`, flags: MessageFlags.Ephemeral });
  if (!value)          return interaction.reply({ content: `${e('btn_error')} Valeur obligatoire.`, flags: MessageFlags.Ephemeral });
  if (value.length > 1024) return interaction.reply({ content: `${e('btn_error')} Valeur trop longue (max 1024).`, flags: MessageFlags.Ephemeral });

  addField(interaction.user.id, { name, value, inline });
  return interaction.update(buildPanelPayload(state));
}

async function handleFieldEditSubmit(interaction, state, args) {
  const fieldIndex = parseInt(args[0], 10);
  const name      = interaction.fields.getTextInputValue('field_name').trim();
  const value     = interaction.fields.getTextInputValue('field_value').trim();
  const inlineRaw = interaction.fields.getTextInputValue('field_inline').trim();
  const inline    = parseInline(inlineRaw);

  if (!name)           return interaction.reply({ content: `${e('btn_error')} Nom du champ obligatoire.`, flags: MessageFlags.Ephemeral });
  if (name.length > 256)  return interaction.reply({ content: `${e('btn_error')} Nom trop long (max 256).`, flags: MessageFlags.Ephemeral });
  if (!value)          return interaction.reply({ content: `${e('btn_error')} Valeur obligatoire.`, flags: MessageFlags.Ephemeral });
  if (value.length > 1024) return interaction.reply({ content: `${e('btn_error')} Valeur trop longue (max 1024).`, flags: MessageFlags.Ephemeral });

  updateField(interaction.user.id, fieldIndex, { name, value, inline });
  return interaction.update(buildPanelPayload(state));
}

async function handleColorSubmit(interaction, state) {
  const { hexToDecimal } = require('../../core/embed-colors');
  const hexInput = interaction.fields.getTextInputValue('color_hex').trim();
  const decimal  = hexToDecimal(hexInput);

  if (decimal === null) {
    return interaction.reply({
      content: `${e('btn_error')} Format HEX invalide. Utilise \`#RRGGBB\` (ex: \`#FF0000\`).`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  updateState(interaction.user.id, { color: decimal });
  return interaction.update(buildPanelPayload(state));
}

async function handleTemplateSaveSubmit(interaction, state, args) {
  const scope   = args[0];
  const name    = interaction.fields.getTextInputValue('template_name').trim();
  const storage = require('../../core/embed-storage');

  let result;
  if (scope === 'user') {
    result = await storage.saveUserTemplate(interaction.user.id, name, state.embed);
  } else {
    result = await storage.saveGuildTemplate(interaction.guild.id, interaction.user.id, name, state.embed);
  }

  if (!result.ok) {
    return interaction.reply({ content: `${e('btn_error')} ${result.reason}`, flags: MessageFlags.Ephemeral });
  }

  return interaction.reply({
    content: `${e('btn_success')} Template **${name}** sauvegardé !`,
    flags  : MessageFlags.Ephemeral,
  });
}

async function handleTemplateRenameSubmit(interaction, state, args) {
  const scope      = args[0];
  const templateId = args[1];
  const newName    = interaction.fields.getTextInputValue('new_name').trim();
  const storage    = require('../../core/embed-storage');
  const ownerId    = scope === 'user' ? interaction.user.id : interaction.guild.id;

  const ok = await storage.renameTemplate(scope, ownerId, templateId, newName);
  if (!ok) {
    return interaction.reply({ content: `${e('btn_error')} Template introuvable.`, flags: MessageFlags.Ephemeral });
  }

  return interaction.reply({
    content: `${e('btn_success')} Template renommé en **${newName}**.`,
    flags  : MessageFlags.Ephemeral,
  });
}

// ── Select menus ──────────────────────────────────────────────────────────────

async function handleEmbedSelectMenu(interaction, client) {
  if (!interaction.customId?.startsWith('emb_select:')) return false;

  const state = getState(interaction.user.id);
  if (!state) {
    await interaction.reply({ content: `${e('btn_error')} Session expirée.`, flags: MessageFlags.Ephemeral });
    return true;
  }

  const action  = interaction.customId.split(':')[1];
  const storage = require('../../core/embed-storage');
  const { updatePanelFromMessage } = require('../../core/embed-update');

  // ── Edit menu (menu principal) ────────────────────────────────────────────
  if (action === 'edit_menu') {
    const val = interaction.values[0];
    switch (val) {
      case 'title':
        return interaction.showModal(buildTitleModal(state));
      case 'desc':
        return interaction.showModal(buildDescriptionModal(state));
      case 'color': {
        const { renderColorPanel } = require('../panels/embed-color-panel');
        await interaction.update({ components: [renderColorPanel(state)], flags: MessageFlags.IsComponentsV2 });
        return true;
      }
      case 'author':
        return interaction.showModal(buildAuthorModal(state));
      case 'footer':
        return interaction.showModal(buildFooterModal(state));
      case 'thumbnail':
        return interaction.showModal(buildThumbnailModal(state));
      case 'image':
        return interaction.showModal(buildImageModal(state));
      case 'timestamp': {
        updateState(interaction.user.id, { timestamp: state.embed.timestamp ? null : new Date().toISOString() });
        await interaction.update(buildPanelPayload(state));
        return true;
      }
      case 'field_add':
        if (state.embed.fields.length >= 25) {
          await interaction.reply({ content: `${e('btn_error')} Limite de 25 champs atteinte.`, flags: MessageFlags.Ephemeral });
          return true;
        }
        return interaction.showModal(buildFieldAddModal());
      case 'field_edit':
        if (state.embed.fields.length === 0) { await interaction.update(buildPanelPayload(state)); return true; }
        return showFieldSelectMenu(interaction, state, 'edit');
      case 'field_remove':
        if (state.embed.fields.length === 0) { await interaction.update(buildPanelPayload(state)); return true; }
        return showFieldSelectMenu(interaction, state, 'remove');
      case 'tpl': {
        const storage   = require('../../core/embed-storage');
        const { renderTemplatesPanel } = require('../panels/embed-templates-panel');
        const userTpls  = storage.listUserTemplates(interaction.user.id);
        const guildTpls = storage.listGuildTemplates(interaction.guild.id);
        await interaction.update({ components: [renderTemplatesPanel(state, userTpls, guildTpls)], flags: MessageFlags.IsComponentsV2 });
        return true;
      }
      case 'emojis': {
        const { renderEmojiPanel } = require('../panels/embed-emoji-panel');
        await interaction.update({ components: [renderEmojiPanel(state, interaction.guild, 0)], flags: MessageFlags.IsComponentsV2 });
        return true;
      }
      case 'reset':
        resetState(interaction.user.id);
        await interaction.update(buildPanelPayload(state));
        return true;
      default:
        await interaction.update(buildPanelPayload(state));
        return true;
    }
  }

  // ── Send channel (ChannelSelectMenu) ─────────────────────────────────────
  if (action === 'send_channel') {
    const channelId = interaction.values[0];
    return executeSend(interaction, state, channelId, client);
  }

  // ── Color preset ──────────────────────────────────────────────────────────
  if (action === 'color_preset') {
    const presetId = interaction.values[0];
    const { COLOR_PRESETS } = require('../../core/embed-colors');
    const preset = COLOR_PRESETS.find(p => p.id === presetId);
    if (!preset) {
      await interaction.reply({ content: `${e('btn_error')} Preset introuvable.`, flags: MessageFlags.Ephemeral });
      return true;
    }
    updateState(interaction.user.id, { color: preset.hex });
    await interaction.update(buildPanelPayload(state));
    return true;
  }

  // ── Field edit ────────────────────────────────────────────────────────────
  if (action === 'field_edit') {
    const fieldIndex = parseInt(interaction.values[0], 10);
    const field      = state.embed.fields[fieldIndex];
    if (!field) {
      await interaction.reply({ content: `${e('btn_error')} Champ introuvable.`, flags: MessageFlags.Ephemeral });
      return true;
    }
    await interaction.showModal(buildFieldEditModal(field, fieldIndex));
    return true;
  }

  // ── Field remove ──────────────────────────────────────────────────────────
  if (action === 'field_remove') {
    const fieldIndex = parseInt(interaction.values[0], 10);
    removeField(interaction.user.id, fieldIndex);
    await interaction.update({ content: `${e('btn_success')} Champ supprimé.`, components: [] });
    await updatePanelFromMessage(client, state);
    return true;
  }

  // ── Template load ─────────────────────────────────────────────────────────
  if (action === 'tpl_load') {
    const [scope, templateId] = interaction.values[0].split(':');
    const tpls    = scope === 'user'
      ? storage.getUserTemplates(interaction.user.id)
      : storage.getGuildTemplates(interaction.guild.id);
    const template = tpls[templateId];
    if (!template) {
      await interaction.reply({ content: `${e('btn_error')} Template introuvable.`, flags: MessageFlags.Ephemeral });
      return true;
    }

    const embedData = { ...template };
    delete embedData.savedAt;
    delete embedData.createdBy;
    state.embed = { ...state.embed, ...embedData };
    if (Array.isArray(template.fields)) state.embed.fields = [...template.fields];

    await interaction.update({ content: `${e('btn_success')} Template **${templateId}** chargé !`, components: [] });
    await updatePanelFromMessage(client, state);
    return true;
  }

  // ── Template delete ───────────────────────────────────────────────────────
  if (action === 'tpl_delete') {
    const [scope, templateId] = interaction.values[0].split(':');
    if (scope === 'user') {
      await storage.deleteUserTemplate(interaction.user.id, templateId);
    } else {
      await storage.deleteGuildTemplate(interaction.guild.id, templateId);
    }
    await interaction.update({ content: `${e('btn_success')} Template **${templateId}** supprimé.`, components: [] });
    return true;
  }

  // ── Template rename ───────────────────────────────────────────────────────
  if (action === 'tpl_rename') {
    const [scope, templateId] = interaction.values[0].split(':');
    const ownerId  = scope === 'user' ? interaction.user.id : interaction.guild.id;
    const tpls     = scope === 'user' ? storage.getUserTemplates(ownerId) : storage.getGuildTemplates(ownerId);
    const template = tpls[templateId];
    if (!template) {
      await interaction.reply({ content: `${e('btn_error')} Template introuvable.`, flags: MessageFlags.Ephemeral });
      return true;
    }
    await interaction.showModal(buildTemplateRenameModal(scope, templateId, templateId));
    return true;
  }

  return false;
}

module.exports = { handleEmbedInteraction, handleEmbedModalSubmit, handleEmbedSelectMenu, buildEmbedFromState };
