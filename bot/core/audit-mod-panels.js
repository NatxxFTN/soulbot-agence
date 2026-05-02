'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT-MOD PANELS — Helpers Components V2 réutilisables pour le pack Audit
// Garantit cohérence visuelle (couleurs sémantiques + structure Container).
// ═══════════════════════════════════════════════════════════════════════════

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const COLORS = {
  info     : 0x5865F2,
  danger   : 0xFF0000,
  success  : 0x00FF88,
  warning  : 0xFFB800,
};

function _container(color) {
  return new ContainerBuilder().setAccentColor(color);
}

function _text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function _sep(size = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setSpacing(size);
}

/**
 * Panel d'information générique. `body` peut contenir des sections séparées
 * par '\n---\n' (rendues comme Separator entre TextDisplay).
 */
function infoPanel(title, body, color = COLORS.info) {
  const ct = _container(color);
  ct.addTextDisplayComponents(_text(`### ${title}`));
  ct.addSeparatorComponents(_sep());
  for (const section of String(body).split('\n---\n')) {
    if (!section.trim()) continue;
    ct.addTextDisplayComponents(_text(section));
  }
  return { components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } };
}

const dangerPanel  = (title, body) => infoPanel(title, body, COLORS.danger);
const successPanel = (title, body) => infoPanel(title, body, COLORS.success);
const warningPanel = (title, body) => infoPanel(title, body, COLORS.warning);

/**
 * Panel de confirmation rouge avec instructions explicites.
 * @param {string} title
 * @param {string} previewBody — texte preview de l'action
 * @param {string} confirmCmd — exemple de commande exacte à retaper pour confirmer
 */
function confirmPanel(title, previewBody, confirmCmd) {
  return dangerPanel(
    title,
    `${previewBody}\n---\n**Pour confirmer**, retape exactement :\n\`${confirmCmd}\`\n\n*Cette confirmation expire dès qu'une autre commande est tapée.*`,
  );
}

/**
 * Liste paginée simple. Items déjà formatés (un par ligne).
 */
function paginatedList(title, items, page, perPage, color = COLORS.info, footer = null) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const cur   = Math.max(1, Math.min(pages, page));
  const slice = items.slice((cur - 1) * perPage, cur * perPage);

  const body = slice.length ? slice.join('\n') : '*Aucun résultat.*';
  const meta = `\n---\nPage **${cur}/${pages}** · ${total} résultat${total > 1 ? 's' : ''}`;
  const tail = footer ? `\n${footer}` : '';

  return infoPanel(title, body + meta + tail, color);
}

module.exports = {
  COLORS,
  infoPanel,
  dangerPanel,
  successPanel,
  warningPanel,
  confirmPanel,
  paginatedList,
};
