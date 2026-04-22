'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');
const { getRaidmodeConfig, getRecentDetections } = require('../../core/raidmode-helper');
const { e, forButton } = require('../../core/emojis');

const ACTION_LABELS = { kick: 'Expulser', ban: 'Bannir', timeout: 'Timeout 10min' };

/**
 * Panel Raidmode — Components V2.
 * ~20 inner components.
 */
function renderRaidmodePanel(guildId) {
  const cfg    = getRaidmodeConfig(guildId) || {};
  const active = !!cfg.active;
  const thresh = cfg.join_threshold  ?? 5;
  const window = cfg.join_window_sec ?? 10;
  const action = cfg.action          || 'kick';
  const dets   = getRecentDetections(guildId);

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${e('cat_protection')} Raidmode Anti-Raid`),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${active ? '🔴 **RAIDMODE ACTIF**' : '🟢 Protection en veille'}\n` +
      `Seuil : **${thresh}** joins en **${window}s** · Action : **${ACTION_LABELS[action] || action}**`,
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('raidmode:enable')
        .setLabel('Activer maintenant')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(active),
      new ButtonBuilder()
        .setCustomId('raidmode:disable')
        .setLabel('Désactiver')
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
        new TextDisplayBuilder().setContent(`⚙️ **Seuil de détection :** ${thresh} joins en ${window}s`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('raidmode:configure')
          .setLabel('Configurer')
          .setStyle(ButtonStyle.Primary),
      ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('raidmode:action')
        .setPlaceholder(`Action : ${ACTION_LABELS[action] || action}`)
        .addOptions([
          { label: 'Expulser',      value: 'kick',    emoji: '👢' },
          { label: 'Bannir',        value: 'ban',     emoji: forButton('cat_moderation') },
          { label: 'Timeout 10min', value: 'timeout', emoji: '⏱️' },
        ]),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );

  const detText = dets.length > 0
    ? dets.slice(0, 5).map(d => `• <@${d.user_id}> — ${d.action}`).join('\n')
    : '*Aucune détection récente.*';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**Détections récentes :**\n${detText}`),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('raidmode:clear_dets')
        .setLabel('Effacer les logs')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderRaidmodePanel };
