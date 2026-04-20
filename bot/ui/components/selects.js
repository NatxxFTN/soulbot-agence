'use strict';

const {
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { LABELS } = require('../theme');

const selects = {
  channel: (customId, placeholder = LABELS.selectChannel, types = [ChannelType.GuildText]) =>
    new ChannelSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setChannelTypes(types)
      .setMinValues(1)
      .setMaxValues(1),

  role: (customId, placeholder = LABELS.selectRole) =>
    new RoleSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(1),

  string: (customId, placeholder, options) =>
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder || LABELS.selectOption)
      .addOptions(options),
};

module.exports = selects;
