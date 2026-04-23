'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');

/**
 * Panel mini pour une feature unique (antilink, antiinvite, ...).
 * @param {import('discord.js').Guild} guild
 * @param {string} feature  - clé feature dans security_config
 * @param {object} meta     - { label, emoji, description, supportsThreshold, defaultThreshold }
 */
function renderFeaturePanel(guild, feature, meta) {
  const config = storage.getConfig(guild.id, feature) || {
    enabled: 0, action: 'delete', threshold: meta.defaultThreshold || 1,
  };
  const stats = storage.getStatsFeature(guild.id, feature) || { trigger_count: 0, last_triggered: null };

  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  // Header
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e(meta.emoji)} **${meta.label}** ${e('ani_diamond')}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // État
  const statusIcon = config.enabled ? '🟢' : '🔴';
  const statusTxt  = config.enabled ? '**Actif**' : '**Inactif**';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${statusIcon} Statut : ${statusTxt}\n` +
      `${e('cat_information')} ${meta.description}\n` +
      `${e('cat_giveaway')} Déclenchements : **${stats.trigger_count}**` +
      (stats.last_triggered ? ` · dernier <t:${Math.floor(stats.last_triggered / 1000)}:R>` : ''),
    ),
  );

  if (config.enabled) {
    const thresholdPart = meta.supportsThreshold ? ` · Seuil : **${config.threshold}**` : '';
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('cat_configuration')} Action : \`${config.action}\`${thresholdPart}`,
      ),
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Actions
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`secfeat:${feature}:toggle`)
        .setLabel(config.enabled ? 'Désactiver' : 'Activer')
        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`secfeat:${feature}:back`)
        .setLabel('← Panel principal')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  // Select action
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`secfeat:${feature}:set_action`)
        .setPlaceholder(`⚙️ Action actuelle : ${config.action}`)
        .addOptions([
          { label: 'Supprimer seulement', value: 'delete',  emoji: '🗑️' },
          { label: 'Avertir (warn)',       value: 'warn',    emoji: '⚠️' },
          { label: 'Muet 5 minutes',       value: 'mute_5m', emoji: '🔇' },
          { label: 'Muet 1 heure',         value: 'mute_1h', emoji: '🔇' },
          { label: 'Expulser (kick)',      value: 'kick',    emoji: '👢' },
          { label: 'Bannir',               value: 'ban',     emoji: '🔨' },
        ]),
    ),
  );

  // Select threshold si supporté
  if (meta.supportsThreshold) {
    const thresholds = [2, 3, 5, 7, 10, 15, 20];
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`secfeat:${feature}:set_threshold`)
          .setPlaceholder(`🎯 Seuil actuel : ${config.threshold}`)
          .addOptions(thresholds.map(n => ({ label: `Seuil : ${n}`, value: String(n) }))),
      ),
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('btn_tip')} Raccourcis : \`;${feature} on|off\` · \`;${feature} action <type>\`` +
      (meta.supportsThreshold ? ` · \`;${feature} threshold <n>\`` : ''),
    ),
  );

  return container;
}

module.exports = { renderFeaturePanel };
