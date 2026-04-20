'use strict';

const { ButtonBuilder, ButtonStyle } = require('discord.js');
const { EMOJIS, LABELS } = require('../theme');

const buttons = {
  reset    : (customId)        => new ButtonBuilder().setCustomId(customId).setLabel(LABELS.reset).setEmoji(EMOJIS.reset).setStyle(ButtonStyle.Danger),
  configure: (customId, label) => new ButtonBuilder().setCustomId(customId).setLabel(label || LABELS.configure).setEmoji(EMOJIS.config).setStyle(ButtonStyle.Primary),
  back     : (customId)        => new ButtonBuilder().setCustomId(customId).setLabel(LABELS.back).setEmoji(EMOJIS.back).setStyle(ButtonStyle.Secondary),
  save     : (customId)        => new ButtonBuilder().setCustomId(customId).setLabel(LABELS.save).setEmoji(EMOJIS.save).setStyle(ButtonStyle.Success),
  cancel   : (customId)        => new ButtonBuilder().setCustomId(customId).setLabel(LABELS.cancel).setStyle(ButtonStyle.Secondary),
};

module.exports = buttons;
