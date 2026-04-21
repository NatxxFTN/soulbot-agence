'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');
const { getWarnConfig, getThresholds } = require('../../core/warn-helper');
const { forButton } = require('../../core/emojis');

const st = (on) => on ? '🟢' : '🔴';

const ACTION_LABELS = {
  mute   : '🔇 Mute',
  timeout: '⏱️ Timeout',
  kick   : '👢 Kick',
  ban    : '🔨 Ban',
};

function fmtDuration(secs) {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}j`;
  if (h >= 1) return `${h}h`;
  return `${m}min`;
}

function fmtThreshold(t) {
  const action = ACTION_LABELS[t.action] || t.action;
  const dur    = t.duration ? ` (${fmtDuration(t.duration)})` : '';
  return `• **${t.count} warns** → ${action}${dur}`;
}

function renderWarnconfigPanel(guildId) {
  const cfg        = getWarnConfig(guildId) || {};
  const thresholds = getThresholds(guildId);

  const enabled  = cfg.enabled !== 0;
  const logsId   = cfg.logs_channel_id;
  const dmOn     = cfg.dm_warned !== 0;
  const expDays  = cfg.expiration_days ?? 30;

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  // ── Titre + status ───────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# ⚠️ Configuration Warns'),
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${st(enabled)} Système warns — ${enabled ? '**Activé**' : 'Désactivé'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('warnconfig:toggle')
          .setLabel(enabled ? 'Désactiver' : 'Activer')
          .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Salon logs ───────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📝 **Salon logs warns** : ${logsId ? `<#${logsId}>` : '*Non défini*'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('warnconfig:logs_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!logsId),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('warnconfig:logs')
        .setPlaceholder('Sélectionner un salon de logs warns')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(1).setMaxValues(1),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Comportements ────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${st(dmOn)} **DM le membre warnéé** — ${dmOn ? 'Activé' : 'Désactivé'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('warnconfig:dm_toggle')
          .setLabel(dmOn ? 'Désactiver' : 'Activer')
          .setStyle(dmOn ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📅 **Expiration warns** : ${expDays === 0 ? '**Jamais**' : `**${expDays} jour${expDays > 1 ? 's' : ''}**`}\n` +
          `*Durée avant qu'un warn expire automatiquement. 0 = jamais.*`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('warnconfig:exp_modal')
          .setLabel('Modifier')
          .setStyle(ButtonStyle.Secondary),
      ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Seuils automatiques ──────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('### 📊 Seuils automatiques'),
  );

  if (thresholds.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Aucun seuil configuré.*'),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(thresholds.map(fmtThreshold).join('\n')),
    );
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('warnconfig:add_threshold')
        .setLabel('Ajouter un seuil')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('warnconfig:remove_threshold_modal')
        .setLabel('Retirer un seuil')
        .setEmoji('➖')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(thresholds.length === 0),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Bas ──────────────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('warnconfig:help')
        .setLabel('Aide')
        .setEmoji(forButton('btn_help'))
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderWarnconfigPanel };
