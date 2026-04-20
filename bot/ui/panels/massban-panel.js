'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');
const { db } = require('../../database');

function getRecentMassbans(guildId) {
  return db.prepare('SELECT * FROM massban_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 3').all(guildId);
}

/**
 * Panel Massban — Components V2.
 * ~11 inner components.
 */
function renderMassbanPanel(guildId) {
  const recent    = getRecentMassbans(guildId);
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🔨 Massban Ciblé'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '> Bannit jusqu\'à **10 utilisateurs** simultanément par leurs IDs Discord.\n' +
      '> Chaque ID est vérifié avant bannissement. Les IDs invalides sont ignorés.',
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('massban:open_modal')
        .setLabel('🔨 Bannir des utilisateurs')
        .setStyle(ButtonStyle.Danger),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );

  const histText = recent.length > 0
    ? recent.map(r => {
        const date = new Date(r.timestamp * 1000).toLocaleString('fr-FR');
        return `• \`${date}\` — **${r.success}** bannis · **${r.failed}** échecs`;
      }).join('\n')
    : '*Aucun massban enregistré.*';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**Historique récent :**\n${histText}`),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('massban:close')
        .setLabel('Fermer')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderMassbanPanel };
