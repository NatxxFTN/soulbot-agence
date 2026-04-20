'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');
const { getLockdownConfig, getLockedChannels } = require('../../core/lockdown-helper');

/**
 * Panel Lockdown — Components V2.
 * ~16 inner components.
 */
function renderLockdownPanel(guildId) {
  const cfg     = getLockdownConfig(guildId) || {};
  const active  = !!cfg.active;
  const chans   = getLockedChannels(guildId);
  const reason  = cfg.reason || '*Aucune raison définie*';

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🔒 Lockdown Serveur'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${active ? '🔴 **LOCKDOWN ACTIF**' : '🟢 Serveur déverrouillé'}\n` +
      (active ? `Salons verrouillés : **${chans.length}** · Par <@${cfg.locked_by ?? 'inconnu'}>` : ''),
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('lockdown:lock')
        .setLabel('🔒 Verrouiller')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(active),
      new ButtonBuilder()
        .setCustomId('lockdown:unlock')
        .setLabel('🔓 Déverrouiller')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!active),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`📝 **Raison :** ${reason}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('lockdown:set_reason')
          .setLabel('Définir')
          .setStyle(ButtonStyle.Primary),
      ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '> Le lockdown bloque l\'envoi de messages pour **@everyone** dans tous les salons texte. ' +
      'Les permissions existantes sont restaurées au déverrouillage.',
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('lockdown:close')
        .setLabel('Fermer')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderLockdownPanel };
