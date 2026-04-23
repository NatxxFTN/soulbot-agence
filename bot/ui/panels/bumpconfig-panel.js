'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
  ChannelSelectMenuBuilder, RoleSelectMenuBuilder,
  ChannelType, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/bump-storage');

/**
 * Rend le panel de configuration Bump.
 * @param {string} guildId
 * @returns {{ components, flags }} payload prêt pour reply/update
 */
function renderBumpConfigPanel(guildId) {
  const config = storage.getConfig(guildId) || {
    channel_id: null, role_id: null, custom_message: null, enabled: 0,
  };

  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  // ── Titre ─────────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('ani_diamond')} **Configuration Bump** ${e('ani_diamond')}`,
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── État ──────────────────────────────────────────────────────────────────
  const statusEmoji = config.enabled ? e('btn_success') : e('btn_error');
  const statusText  = config.enabled ? '**Activé**'     : '**Désactivé**';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${statusEmoji} Système : ${statusText}`),
  );

  const channelDisplay = config.channel_id ? `<#${config.channel_id}>` : '*Aucun*';
  const roleDisplay    = config.role_id    ? `<@&${config.role_id}>`   : '*Aucun*';
  const messageDisplay = config.custom_message ? '*Personnalisé*' : '*Par défaut*';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('ui_folder')} Salon de rappel : ${channelDisplay}\n` +
      `${e('ui_user')} Rôle à ping : ${roleDisplay}\n` +
      `${e('ui_chat')} Message : ${messageDisplay}`,
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Sélecteur salon ───────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('ui_folder')} **Salon de rappel**`),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('bumpcfg:channel')
        .setPlaceholder('Choisis le salon où envoyer les rappels')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setMinValues(1).setMaxValues(1),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Sélecteur rôle ────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('ui_user')} **Rôle à ping** (optionnel)`),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('bumpcfg:role')
        .setPlaceholder('Choisis un rôle à mentionner (optionnel)')
        .setMinValues(1).setMaxValues(1),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('bumpcfg:message')
        .setLabel('Message custom')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('bumpcfg:toggle')
        .setLabel(config.enabled ? 'Désactiver' : 'Activer')
        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('bumpcfg:role_none')
        .setLabel('Retirer rôle ping')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('bumpcfg:test')
        .setLabel('Tester rappel')
        .setStyle(ButtonStyle.Primary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('btn_tip')} *Les rappels s'envoient automatiquement 2h après chaque bump réussi.*`,
    ),
  );

  return {
    components: [container],
    flags     : MessageFlags.IsComponentsV2,
  };
}

module.exports = { renderBumpConfigPanel };
