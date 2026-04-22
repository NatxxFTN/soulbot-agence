'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');
const { getTicketConfig } = require('../../core/ticket-helper');
const { e, forButton } = require('../../core/emojis');

const STATUS = (val) => val ? '**Défini**' : '*Non défini*';

/**
 * Panel principal de configuration tickets — Components V2.
 * Clone visuel strict du pattern Greeting v5.
 * @param {string} guildId
 */
function renderTicketPanel(guildId) {
  const cfg = getTicketConfig(guildId) || {};

  const isEnabled  = !!cfg.enabled;
  const categoryId = cfg.category_id;
  const logsId     = cfg.log_channel_id;
  const staffId    = cfg.staff_role_id;
  const openMsg    = cfg.open_message;
  const openEmbed  = cfg.open_embed;

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  // ── Titre ─────────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${e('cat_ticket')} Configuration Tickets`),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${isEnabled ? '🟢' : '🔴'} Système ${isEnabled ? '**Activé**' : 'Désactivé'}`,
    ),
  );

  // ── Toggle ─────────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:toggle')
        .setLabel(isEnabled ? 'Désactiver' : 'Activer')
        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Catégorie ──────────────────────────────────────────────────────────────
  const catDisplay = categoryId ? `<#${categoryId}>` : '*Non définie*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('ui_folder')} **Catégorie :** ${catDisplay}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:category_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('ticket:category')
        .setPlaceholder('Sélectionner une catégorie')
        .setChannelTypes([ChannelType.GuildCategory])
        .setMinValues(1).setMaxValues(1),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Salon logs ─────────────────────────────────────────────────────────────
  const logsDisplay = logsId ? `<#${logsId}>` : '*Non défini*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`📝 **Salon logs :** ${logsDisplay}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:logs_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('ticket:logs')
        .setPlaceholder('Sélectionner un salon logs')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(1).setMaxValues(1),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Rôle staff ─────────────────────────────────────────────────────────────
  const staffDisplay = staffId ? `<@&${staffId}>` : '*Non défini*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`👮 **Rôle staff :** ${staffDisplay}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:staff_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('ticket:staff')
        .setPlaceholder('Sélectionner le rôle staff')
        .setMinValues(1).setMaxValues(1),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Message d'ouverture ────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`💬 **Message d'ouverture :** ${STATUS(!!openMsg)}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:open_message_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:open_message_modal')
        .setLabel('Configurer le message')
        .setEmoji(forButton('ui_chat'))
        .setStyle(ButtonStyle.Primary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Embed d'ouverture ──────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🖼️ **Embed d'ouverture :** ${STATUS(!!openEmbed)}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:open_embed_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:open_embed_modal')
        .setLabel("Configurer l'embed")
        .setEmoji('🖼️')
        .setStyle(ButtonStyle.Primary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );

  // ── Bas de panel ───────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:advanced')
        .setLabel('Configuration avancée')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ticket:variables')
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

/**
 * Sous-panel avancé — options complémentaires.
 * @param {string} guildId
 */
function renderTicketAdvancedPanel(guildId) {
  const cfg = getTicketConfig(guildId) || {};

  const closeMsg          = cfg.close_message;
  const closeEmbed        = cfg.close_embed;
  const transcriptEnabled = cfg.transcript_enabled !== 0;
  const maxPerUser        = cfg.max_per_user ?? 1;
  const cooldownSec       = cfg.cooldown_seconds ?? 0;

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# ⚙️ Tickets — Configuration avancée'),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Message de fermeture ───────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`💬 **Message de fermeture :** ${STATUS(!!closeMsg)}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:close_message_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:close_message_modal')
        .setLabel('Configurer le message')
        .setEmoji(forButton('ui_chat'))
        .setStyle(ButtonStyle.Primary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Embed de fermeture ─────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🖼️ **Embed de fermeture :** ${STATUS(!!closeEmbed)}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:close_embed_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:close_embed_modal')
        .setLabel("Configurer l'embed")
        .setEmoji('🖼️')
        .setStyle(ButtonStyle.Primary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Transcript ─────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📄 **Transcript :** ${transcriptEnabled ? '🟢 **Activé**' : '🔴 Désactivé'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:transcript_toggle')
          .setLabel(transcriptEnabled ? 'Désactiver' : 'Activer')
          .setStyle(transcriptEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Max tickets par user ───────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🔢 **Max tickets par utilisateur :** **${maxPerUser}**`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:max_user_modal')
          .setLabel('Modifier')
          .setStyle(ButtonStyle.Primary),
      ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Cooldown ───────────────────────────────────────────────────────────────
  const cooldownDisplay = cooldownSec === 0 ? '*Aucun cooldown*' : `**${cooldownSec}** secondes`;
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`⏱️ **Cooldown entre tickets :** ${cooldownDisplay}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ticket:cooldown_modal')
          .setLabel('Modifier')
          .setStyle(ButtonStyle.Primary),
      ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );

  // ── Retour ─────────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:back_main')
        .setLabel('Retour')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return {
    components: [container],
    flags     : MessageFlags.IsComponentsV2,
  };
}

module.exports = { renderTicketPanel, renderTicketAdvancedPanel };
