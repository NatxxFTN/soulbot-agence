'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
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
const { getAntispamConfig, getWhitelistRoles } = require('../../core/antispam-helper');
const { e, forButton } = require('../../core/emojis');

const SANCTION_OPTIONS = [
  { label: 'Supprimer le message', value: 'delete',  emoji: forButton('btn_trash') },
  { label: 'Avertir',              value: 'warn',    emoji: '⚠️' },
  { label: 'Timeout 10 min',       value: 'timeout', emoji: '⏱️' },
  { label: 'Expulser',             value: 'kick',    emoji: '👢' },
  { label: 'Bannir',               value: 'ban',     emoji: forButton('cat_moderation') },
  { label: 'Aucune action',        value: 'none',    emoji: '🚫' },
];

const SANCTION_LABELS = {
  none: 'Aucune', delete: 'Supprimer', warn: 'Avertir',
  timeout: 'Timeout', kick: 'Expulser', ban: 'Bannir',
};

const sl = (s) => SANCTION_LABELS[s] || 'Timeout';
const st = (on) => on ? '🟢' : '🔴';

function sanctionSelect(customId, current) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(`Sanction : ${sl(current)}`)
    .addOptions(SANCTION_OPTIONS);
}

/**
 * Panel principal Anti-Spam — Components V2.
 * 37 inner components (sous limite 40).
 */
function renderAntispamPanel(guildId) {
  const cfg       = getAntispamConfig(guildId) || {};
  const whitelist = getWhitelistRoles(guildId);

  const isEnabled      = !!cfg.enabled;
  const capsEnabled    = !!cfg.caps_enabled;
  const floodT         = cfg.flood_threshold      ?? 5;
  const floodW         = cfg.flood_window_seconds  ?? 5;
  const mentionsT      = cfg.mentions_threshold    ?? 5;
  const repeatT        = cfg.repeat_threshold      ?? 3;
  const capsT          = cfg.caps_threshold        ?? 70;
  const capsMin        = cfg.caps_min_length       ?? 10;
  const logsId         = cfg.logs_channel_id;

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  // ── Titre + status ─────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🚫 Configuration Anti-Spam'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${st(isEnabled)} Protection ${isEnabled ? '**Activée**' : 'Désactivée'}`,
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('antispam:toggle')
        .setLabel(isEnabled ? 'Désactiver' : 'Activer')
        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Flood ──────────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `💥 **Flood** : max **${floodT}** msgs en **${floodW}s** | Sanction : **${sl(cfg.flood_sanction)}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('antispam:flood_modal')
          .setLabel('Configurer')
          .setStyle(ButtonStyle.Primary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      sanctionSelect('antispam:sanction_flood', cfg.flood_sanction),
    ),
  );

  // ── Mentions ───────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('cat_information')} **Mentions** : max **${mentionsT}** mentions/msg | Sanction : **${sl(cfg.mentions_sanction)}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('antispam:mentions_modal')
          .setLabel('Configurer')
          .setStyle(ButtonStyle.Primary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      sanctionSelect('antispam:sanction_mentions', cfg.mentions_sanction),
    ),
  );

  // ── Répétition ─────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🔄 **Répétition** : max **${repeatT}** msgs identiques | Sanction : **${sl(cfg.repeat_sanction)}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('antispam:repeat_modal')
          .setLabel('Configurer')
          .setStyle(ButtonStyle.Primary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      sanctionSelect('antispam:sanction_repeat', cfg.repeat_sanction),
    ),
  );

  // ── CAPS ───────────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🔡 **CAPS** : ${st(capsEnabled)} | ${capsT}% min · ${capsMin} chars | Sanction : **${sl(cfg.caps_sanction)}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('antispam:caps_toggle')
          .setLabel(capsEnabled ? 'Désactiver' : 'Activer')
          .setStyle(capsEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('antispam:caps_modal')
        .setLabel('Configurer les seuils')
        .setStyle(ButtonStyle.Primary),
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      sanctionSelect('antispam:sanction_caps', cfg.caps_sanction),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
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
          .setCustomId('antispam:logs_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('antispam:logs')
        .setPlaceholder('Sélectionner un salon de logs')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(1).setMaxValues(1),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );

  // ── Bas ────────────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('antispam:whitelist')
        .setLabel(`Whitelist (${whitelist.length})`)
        .setEmoji(forButton('btn_success'))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('antispam:help')
        .setLabel('Aide')
        .setEmoji(forButton('btn_help'))
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/**
 * Sous-panel whitelist antispam.
 */
function renderAntispamWhitelistPanel(guildId) {
  const whitelist = getWhitelistRoles(guildId);

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${e('btn_success')} Whitelist Anti-Spam`),
  );

  const listContent = whitelist.length > 0
    ? whitelist.map(id => `• <@&${id}>`).join('\n')
    : '*Aucun rôle exempté.*';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(listContent),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('**Ajouter un rôle :**'),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('antispam:whitelist_add')
        .setPlaceholder('Sélectionner un rôle à exempter')
        .setMinValues(1).setMaxValues(1),
    ),
  );

  if (whitelist.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**Retirer un rôle :**'),
    );
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('antispam:whitelist_remove')
          .setPlaceholder('Sélectionner un rôle à retirer')
          .addOptions(
            whitelist.slice(0, 25).map((id) => ({
              label: `ID : ${id}`,
              value: id,
              emoji: '❌',
            })),
          ),
      ),
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('antispam:back_main')
        .setLabel('Retour')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderAntispamPanel, renderAntispamWhitelistPanel };
