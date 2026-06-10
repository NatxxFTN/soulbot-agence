'use strict';

// ═══════════════════════════════════════════════
// PANELS V4 — v2.1.2
// Briques réutilisables pour les panels de configuration :
//   mainConfigPanel  — panel à onglets (navigation par StringSelect)
//   scrollablePanel  — liste paginée (boutons prev/next)
//   editableModal    — modal d'édition générique
//
// Construit sur Components V2 (ContainerBuilder) — convention projet,
// pas d'embeds classiques. Charte magenta 0xB600A8.
// ═══════════════════════════════════════════════

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, StringSelectMenuBuilder,
  ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  MessageFlags,
} = require('discord.js');
const { e, forButton } = require('../core/emojis');
const { version } = require('../../package.json');

// Rouge demandé par Nathan (10/06/2026) pour les accents de panels —
// déviation assumée de la charte magenta : le magenta reste sur les embeds.
const ACCENT = 0xFF0000;

/**
 * Panel de configuration principal — navigation par onglets via StringSelect.
 *
 * @param {object} config
 * @param {string} config.title
 * @param {string} [config.description]
 * @param {Array<{key: string, label: string, emojiName?: string}>} config.sections
 * @param {string} config.selectAction - action du protocole customId (ex. 'botcfg:tab')
 * @param {string} [currentTab] - clé de la section active
 * @param {object} [body] - contenu de la section active
 * @param {string} [body.text] - bloc de texte affiché sous le select
 * @param {Array<import('discord.js').ActionRowBuilder>} [body.rows] - rows d'action de la section
 * @returns {{ components, flags }} payload prêt pour reply/update
 */
function mainConfigPanel(config, currentTab, body = {}) {
  const container = new ContainerBuilder().setAccentColor(ACCENT);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('cat_configuration')} **${config.title}**`),
  );
  if (config.description) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(config.description),
    );
  }
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId(config.selectAction)
    .setPlaceholder('Choisir une section…')
    .addOptions(config.sections.map((sec) => {
      const opt = {
        label  : sec.label,
        value  : sec.key,
        default: sec.key === currentTab,
      };
      if (sec.emojiName) {
        const emoji = forButton(sec.emojiName);
        if (typeof emoji === 'object') opt.emoji = emoji;
      }
      return opt;
    }));

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(select),
  );

  if (body.text) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(body.text),
    );
  }
  for (const row of body.rows ?? []) container.addActionRowComponents(row);

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# Soulbot v${version}`),
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/**
 * Panel scrollable — liste paginée avec navigation Précédent/Suivant.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string[]} [options.items]
 * @param {number} [options.itemsPerPage]
 * @param {number} [options.currentPage] - 1-based
 * @param {string} options.navAction - préfixe customId (ex. 'botcfg:page')
 * @returns {{ components, flags }}
 */
function scrollablePanel({ title, items = [], itemsPerPage = 5, currentPage = 1, navAction }) {
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const page  = Math.min(Math.max(1, currentPage), totalPages);
  const start = (page - 1) * itemsPerPage;
  const pageItems = items.slice(start, start + itemsPerPage);

  const container = new ContainerBuilder().setAccentColor(ACCENT);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('ui_folder')} **${title}**`),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(pageItems.join('\n') || '*Aucun élément.*'),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${navAction}:${page - 1}`)
        .setEmoji(forButton('btn_prev'))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`${navAction}:noop`)
        .setLabel(`${page}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`${navAction}:${page + 1}`)
        .setEmoji(forButton('btn_next'))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/**
 * Modal d'édition générique.
 *
 * @param {object} options
 * @param {string} options.customId - protocole 'action:param' (PAS de Date.now() :
 *   le routing central interactionCreate matche sur l'action, un id daté casserait le match)
 * @param {string} options.title
 * @param {Array<{id: string, label: string, value?: string, required?: boolean,
 *   paragraph?: boolean, placeholder?: string, maxLength?: number}>} options.fields
 * @returns {ModalBuilder}
 */
function editableModal({ customId, title, fields = [] }) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

  for (const field of fields) {
    const input = new TextInputBuilder()
      .setCustomId(field.id)
      .setLabel(field.label)
      .setRequired(field.required ?? true)
      .setStyle(field.paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short);
    if (field.value)       input.setValue(String(field.value));
    if (field.placeholder) input.setPlaceholder(field.placeholder);
    if (field.maxLength)   input.setMaxLength(field.maxLength);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  return modal;
}

module.exports = { mainConfigPanel, scrollablePanel, editableModal, ACCENT };
