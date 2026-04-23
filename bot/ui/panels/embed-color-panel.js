'use strict';

// ── Embed Builder — Panel Couleur ─────────────────────────────────────────────

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const { COLORS } = require('../theme');
const { COLOR_PRESETS, decimalToHex } = require('../../core/embed-colors');

function renderColorPanel(state) {
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 🎨 Couleur de l\'embed'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      state.embed.color
        ? `${e('btn_flag')} Couleur actuelle : \`${decimalToHex(state.embed.color)}\``
        : `${e('btn_tip')} Aucune couleur définie (par défaut)`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Presets
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('⚙️ **Presets Premium**'),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('emb_select:color_preset')
        .setPlaceholder('Choisis un preset de couleur')
        .addOptions(
          COLOR_PRESETS.map(p => ({
            label      : p.label,
            value      : p.id,
            emoji      : p.emoji,
            description: decimalToHex(p.hex),
          })),
        ),
    ),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // HEX custom + no color
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('✏️ **Couleur personnalisée**'),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('emb:color:custom')
        .setLabel('Saisir HEX')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('emb:color:none')
        .setLabel('Pas de couleur')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('emb:color:back')
        .setLabel('← Retour au constructeur')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return container;
}

module.exports = { renderColorPanel };
