'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS, LABELS } = require('../theme');
const { getConfig } = require('../../core/greeting-helper');
const { e, forButton } = require('../../core/emojis');

const STATUS = (val) => val ? '**Défini**' : '*Non défini*';

/**
 * Panel Greeting v4 — clone visuel strict Mya/Crowbot.
 * Discord Components V2 — dépasse la limite 5 ActionRows.
 *
 * @param {string} guildId
 * @param {'join'|'leave'} mode
 */
function renderPanel(guildId, mode = 'join') {
  const cfg    = getConfig(guildId) || {};
  const isJoin = mode === 'join';

  const channelId = isJoin ? cfg.join_channel_id : cfg.leave_channel_id;
  const message   = isJoin ? cfg.join_message    : cfg.leave_message;
  const embedCfg  = isJoin ? cfg.join_embed       : cfg.leave_embed;
  const dm        = isJoin ? cfg.join_dm          : cfg.leave_dm;
  const dmEmbed   = isJoin ? cfg.join_dm_embed    : cfg.leave_dm_embed;
  const isEnabled = isJoin ? !!cfg.join_enabled   : !!cfg.leave_enabled;

  const modeLabel = isJoin ? 'Arrivée' : 'Départ';
  const modeEmoji = isJoin ? '🔔' : e('cat_greeting');

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  // ── Titre + dropdown mode ─────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 🍊 Configuration Greeting — ${modeEmoji} ${modeLabel}`),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('greeting:mode:select')
        .setPlaceholder(`${modeEmoji} ${modeLabel}`)
        .addOptions(
          { label: 'Arrivée', value: 'join',  emoji: '🔔',                       default: isJoin  },
          { label: 'Départ',  value: 'leave', emoji: forButton('cat_greeting'), default: !isJoin },
        ),
    ),
  );

  // ── Toggle ────────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`greeting:${mode}:toggle`)
        .setLabel(isEnabled ? 'Désactiver' : 'Activer')
        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Salon ─────────────────────────────────────────────────────────────────
  const salonDisplay = channelId ? `<#${channelId}>` : '🔒 Aucun accès';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Salon : ${salonDisplay}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`greeting:${mode}:channel_reset`)
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(`greeting:${mode}:channel`)
        .setPlaceholder('Sélectionner un salon')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(1).setMaxValues(1),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Message ───────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('ui_chat')} Message : ${STATUS(!!message)}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`greeting:${mode}:message_reset`)
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`greeting:${mode}:message_modal`)
        .setLabel('Configurer le message')
        .setStyle(ButtonStyle.Primary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Embed ─────────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🖼️ Embed : ${STATUS(!!embedCfg)}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`greeting:${mode}:embed_reset`)
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`greeting:${mode}:embed_modal`)
        .setLabel('Configurer l\'embed')
        .setStyle(ButtonStyle.Primary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── DM ────────────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('ui_mail')} DM : ${STATUS(!!dm)}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`greeting:${mode}:dm_reset`)
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`greeting:${mode}:dm_modal`)
        .setLabel('Configurer le DM')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── DM Embed ──────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`💌 DM Embed : ${STATUS(!!dmEmbed)}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`greeting:${mode}:dm_embed_reset`)
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`greeting:${mode}:dm_embed_modal`)
        .setLabel('Configurer l\'embed DM')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );

  // ── Variables ─────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`greeting:${mode}:variables`)
        .setLabel('Variables')
        .setEmoji(forButton('btn_search'))
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return {
    components: [container],
    flags     : MessageFlags.IsComponentsV2,
  };
}

module.exports = { renderPanel };
