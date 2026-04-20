'use strict';

const { ButtonBuilder, ButtonStyle } = require('discord.js');
const { EMOJIS, LABELS } = require('../theme');

/**
 * Bouton toggle Activer / Désactiver.
 * @param {{ customId: string, isOn: boolean, labelOn?: string, labelOff?: string }}
 */
function buildToggleButton({ customId, isOn, labelOn, labelOff }) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(isOn ? (labelOn || LABELS.deactivate) : (labelOff || LABELS.activate))
    .setStyle(isOn ? ButtonStyle.Danger : ButtonStyle.Success);
}

/**
 * Texte de section pour embed : titre + status + extras optionnels.
 * @param {string}  emoji
 * @param {string}  title
 * @param {boolean} isOn
 * @param {string}  [extra]
 */
function buildSectionText(emoji, title, isOn, extra = '') {
  const status = isOn
    ? `${EMOJIS.on} **${LABELS.statusOn}**`
    : `${EMOJIS.off} ${LABELS.statusOff}`;
  return `${emoji} **${title}**\nStatus : ${status}${extra ? `\n${extra}` : ''}`;
}

module.exports = { buildToggleButton, buildSectionText };
