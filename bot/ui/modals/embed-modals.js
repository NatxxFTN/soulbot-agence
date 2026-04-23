'use strict';

// ── Embed Builder — Modals ────────────────────────────────────────────────────
// Centralise la construction de TOUS les modals du constructeur d'embed.

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { decimalToHex } = require('../../core/embed-colors');

// ── Titre + URL ───────────────────────────────────────────────────────────────

function buildTitleModal(state) {
  return new ModalBuilder()
    .setCustomId('emb_modal:title')
    .setTitle("Titre de l'embed")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title_input')
          .setLabel('Titre (optionnel, laisse vide pour retirer)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setPlaceholder('Ex: Bienvenue sur le serveur !')
          .setValue(state.embed.title ?? '')
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title_url')
          .setLabel('URL du titre (optionnel)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(512)
          .setPlaceholder('https://ton-site.com')
          .setValue(state.embed.titleUrl ?? '')
          .setRequired(false),
      ),
    );
}

// ── Description ───────────────────────────────────────────────────────────────

function buildDescriptionModal(state) {
  return new ModalBuilder()
    .setCustomId('emb_modal:desc')
    .setTitle('Description')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('desc_input')
          .setLabel('Description (markdown Discord supporté)')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(4000)
          .setPlaceholder('Utilise **gras**, *italique*, [liens](url), :nomemoji:...')
          .setValue(state.embed.description ?? '')
          .setRequired(false),
      ),
    );
}

// ── Auteur ────────────────────────────────────────────────────────────────────

function buildAuthorModal(state) {
  return new ModalBuilder()
    .setCustomId('emb_modal:author')
    .setTitle("Auteur de l'embed")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('author_name')
          .setLabel('Nom (vide = retirer l\'auteur)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setPlaceholder('Ex: Soulbot')
          .setValue(state.embed.author?.name ?? '')
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('author_icon')
          .setLabel('URL icône (optionnel)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(512)
          .setPlaceholder("URL d'un avatar")
          .setValue(state.embed.author?.iconUrl ?? '')
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('author_url')
          .setLabel('URL cliquable sur le nom (optionnel)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(512)
          .setPlaceholder('https://lien-auteur.com')
          .setValue(state.embed.author?.url ?? '')
          .setRequired(false),
      ),
    );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function buildFooterModal(state) {
  return new ModalBuilder()
    .setCustomId('emb_modal:footer')
    .setTitle("Footer de l'embed")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('footer_text')
          .setLabel('Texte (vide = retirer le footer)')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(2048)
          .setPlaceholder('Ex: Soulbot · Premium Bot')
          .setValue(state.embed.footer?.text ?? '')
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('footer_icon')
          .setLabel('URL icône footer (optionnel)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(512)
          .setPlaceholder("Petite image à côté du footer")
          .setValue(state.embed.footer?.iconUrl ?? '')
          .setRequired(false),
      ),
    );
}

// ── Miniature ─────────────────────────────────────────────────────────────────

function buildThumbnailModal(state) {
  return new ModalBuilder()
    .setCustomId('emb_modal:thumbnail')
    .setTitle('Miniature (petite image)')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('thumbnail_url')
          .setLabel('URL (laisse vide pour retirer)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(512)
          .setPlaceholder("URL d'une image (PNG, JPG, GIF)")
          .setValue(state.embed.thumbnail ?? '')
          .setRequired(false),
      ),
    );
}

// ── Image principale ──────────────────────────────────────────────────────────

function buildImageModal(state) {
  return new ModalBuilder()
    .setCustomId('emb_modal:image')
    .setTitle('Image principale')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('image_url')
          .setLabel('URL (laisse vide pour retirer)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(512)
          .setPlaceholder("URL d'une grande image")
          .setValue(state.embed.image ?? '')
          .setRequired(false),
      ),
    );
}

// ── Champ — Ajouter ───────────────────────────────────────────────────────────

function buildFieldAddModal() {
  return new ModalBuilder()
    .setCustomId('emb_modal:field_add')
    .setTitle('Ajouter un champ')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_name')
          .setLabel('Nom du champ')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setPlaceholder('Ex: ⚔️ Règles')
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_value')
          .setLabel('Valeur')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1024)
          .setPlaceholder('Ex: Tu dois respecter tout le monde...')
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_inline')
          .setLabel('Inline ? (oui / non)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(5)
          .setPlaceholder('oui ou non')
          .setValue('non')
          .setRequired(false),
      ),
    );
}

// ── Champ — Éditer ────────────────────────────────────────────────────────────

function buildFieldEditModal(field, fieldIndex) {
  return new ModalBuilder()
    .setCustomId(`emb_modal:field_edit:${fieldIndex}`)
    .setTitle(`Éditer le champ ${fieldIndex + 1}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_name')
          .setLabel('Nom du champ')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setValue(field.name)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_value')
          .setLabel('Valeur')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1024)
          .setValue(field.value)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_inline')
          .setLabel('Inline ? (oui / non)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(5)
          .setValue(field.inline ? 'oui' : 'non')
          .setRequired(false),
      ),
    );
}

// ── Couleur HEX ───────────────────────────────────────────────────────────────

function buildColorModal(state) {
  const currentHex = state.embed.color ? decimalToHex(state.embed.color) : '';
  return new ModalBuilder()
    .setCustomId('emb_modal:color')
    .setTitle('Couleur personnalisée')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('color_hex')
          .setLabel('Code HEX (ex: #FF0000)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(9)
          .setPlaceholder('#FF0000 ou FF0000')
          .setValue(currentHex)
          .setRequired(true),
      ),
    );
}

// ── Template — Nom ────────────────────────────────────────────────────────────

function buildTemplateNameModal(scope) {
  return new ModalBuilder()
    .setCustomId(`emb_modal:tpl_save:${scope}`)
    .setTitle(scope === 'user' ? 'Sauvegarder (personnel)' : 'Sauvegarder (serveur)')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('template_name')
          .setLabel('Nom du template')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(50)
          .setMinLength(1)
          .setPlaceholder('Ex: Bienvenue général')
          .setRequired(true),
      ),
    );
}

// ── Template — Renommer ───────────────────────────────────────────────────────

function buildTemplateRenameModal(scope, templateId, currentName) {
  return new ModalBuilder()
    .setCustomId(`emb_modal:tpl_rename:${scope}:${templateId}`)
    .setTitle('Renommer le template')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('new_name')
          .setLabel('Nouveau nom')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(50)
          .setMinLength(1)
          .setValue(currentName)
          .setRequired(true),
      ),
    );
}

module.exports = {
  buildTitleModal,
  buildDescriptionModal,
  buildAuthorModal,
  buildFooterModal,
  buildThumbnailModal,
  buildImageModal,
  buildFieldAddModal,
  buildFieldEditModal,
  buildColorModal,
  buildTemplateNameModal,
  buildTemplateRenameModal,
};
