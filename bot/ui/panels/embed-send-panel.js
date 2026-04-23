'use strict';

// ── Embed Builder — Panel Envoi ───────────────────────────────────────────────

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');

/**
 * @param {object} state — embed-state.js state object
 * @returns {{ components, flags }}
 */
function renderSendPanel(state) {
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 📤 Envoyer l\'embed'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '> Sélectionne le salon cible ou envoie directement dans ce salon.',
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('emb_select:send_channel')
        .setPlaceholder('Choisir un salon cible…')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(1)
        .setMaxValues(1),
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('emb:send:here')
        .setLabel('📨 Envoyer ici')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('emb:send:back')
        .setLabel('← Retour')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderSendPanel };
