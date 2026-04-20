'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

/**
 * Construit un modal Discord.
 * @param {{ customId: string, title: string, inputs: Array }} options
 * @param inputs[].id          — customId du TextInput
 * @param inputs[].label       — label affiché
 * @param inputs[].paragraph   — true = Paragraph, false = Short
 * @param inputs[].placeholder — placeholder optionnel
 * @param inputs[].value       — valeur pré-remplie optionnelle
 * @param inputs[].maxLength   — longueur max optionnelle
 * @param inputs[].required    — requis (default true)
 */
function buildModal({ customId, title, inputs }) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

  for (const input of inputs) {
    const ti = new TextInputBuilder()
      .setCustomId(input.id)
      .setLabel(input.label)
      .setStyle(input.paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(input.required !== false);

    if (input.placeholder) ti.setPlaceholder(input.placeholder);
    if (input.value)       ti.setValue(input.value);
    if (input.maxLength)   ti.setMaxLength(input.maxLength);

    modal.addComponents(new ActionRowBuilder().addComponents(ti));
  }

  return modal;
}

module.exports = { buildModal };
