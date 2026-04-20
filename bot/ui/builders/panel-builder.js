'use strict';

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../theme');

/**
 * Construit un panel premium : embed + components.
 * @param {Object} options
 * @param {string}  options.title
 * @param {string}  [options.description]
 * @param {number}  [options.color]
 * @param {Array}   [options.sections]    — { label, value, inline? }
 * @param {Array}   [options.components]  — ActionRow[]
 * @param {string}  [options.footer]
 * @param {string}  [options.thumbnail]
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildPanel({ title, description, color = COLORS.accent, sections = [], components = [], footer, thumbnail } = {}) {
  const embed = new EmbedBuilder().setColor(color).setTitle(title);

  if (description) embed.setDescription(description);
  if (thumbnail)   embed.setThumbnail(thumbnail);
  if (footer)      embed.setFooter({ text: footer });

  for (const s of sections) {
    embed.addFields({ name: s.label, value: s.value, inline: s.inline || false });
  }

  return {
    embeds    : [embed],
    components: Array.isArray(components) ? components : [],
  };
}

module.exports = { buildPanel };
