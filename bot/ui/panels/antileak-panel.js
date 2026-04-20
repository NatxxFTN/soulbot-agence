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
const { getAntileakConfig, getWhitelistRoles } = require('../../core/antileak-helper');

const SANCTION_OPTIONS = [
  { label: 'Supprimer le message', value: 'delete',  emoji: '🗑️' },
  { label: 'Avertir',              value: 'warn',    emoji: '⚠️' },
  { label: 'Timeout 10 min',       value: 'timeout', emoji: '⏱️' },
  { label: 'Expulser',             value: 'kick',    emoji: '👢' },
  { label: 'Bannir',               value: 'ban',     emoji: '🔨' },
  { label: 'Aucune action',        value: 'none',    emoji: '🚫' },
];

const SANCTION_LABELS = {
  none: 'Aucune', delete: 'Supprimer', warn: 'Avertir',
  timeout: 'Timeout', kick: 'Expulser', ban: 'Bannir',
};

const sl = (s) => SANCTION_LABELS[s] || 'Supprimer';
const st = (on) => on ? '🟢' : '🔴';

function sanctionSelect(customId, current) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(`Sanction : ${sl(current || 'delete')}`)
    .addOptions(SANCTION_OPTIONS);
}

/**
 * Panel principal Anti-Leak — Components V2.
 * 39 inner components (sous limite 40).
 */
function renderAntileakPanel(guildId) {
  const cfg       = getAntileakConfig(guildId) || {};
  const whitelist = getWhitelistRoles(guildId);

  const isEnabled         = !!cfg.enabled;
  const detectToken       = cfg.detect_discord_token !== 0;
  const detectIp          = cfg.detect_ip           !== 0;
  const detectEmail       = cfg.detect_email        !== 0;
  const detectPhone       = cfg.detect_phone        !== 0;
  const logsId            = cfg.logs_channel_id;

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  // ── Titre + status ─────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🛡️ Configuration Anti-Leak'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${st(isEnabled)} Protection ${isEnabled ? '**Activée**' : 'Désactivée'}`,
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('antileak:toggle')
        .setLabel(isEnabled ? 'Désactiver' : 'Activer')
        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Token Discord ──────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🔑 **Token Discord** — ${st(detectToken)} | Sanction : **${sl(cfg.sanction_discord_token)}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('antileak:toggle_discord_token')
          .setLabel(detectToken ? 'Désactiver' : 'Activer')
          .setStyle(detectToken ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      sanctionSelect('antileak:sanction_discord_token', cfg.sanction_discord_token),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Adresse IP ─────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🌐 **Adresse IP** — ${st(detectIp)} | Sanction : **${sl(cfg.sanction_ip)}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('antileak:toggle_ip')
          .setLabel(detectIp ? 'Désactiver' : 'Activer')
          .setStyle(detectIp ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      sanctionSelect('antileak:sanction_ip', cfg.sanction_ip),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── E-mail ─────────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📧 **E-mail** — ${st(detectEmail)} | Sanction : **${sl(cfg.sanction_email)}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('antileak:toggle_email')
          .setLabel(detectEmail ? 'Désactiver' : 'Activer')
          .setStyle(detectEmail ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      sanctionSelect('antileak:sanction_email', cfg.sanction_email),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Numéro de téléphone ────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📞 **Téléphone** — ${st(detectPhone)} | Sanction : **${sl(cfg.sanction_phone)}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('antileak:toggle_phone')
          .setLabel(detectPhone ? 'Désactiver' : 'Activer')
          .setStyle(detectPhone ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      sanctionSelect('antileak:sanction_phone', cfg.sanction_phone),
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
          .setCustomId('antileak:logs_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('antileak:logs')
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
        .setCustomId('antileak:whitelist')
        .setLabel(`Whitelist (${whitelist.length})`)
        .setEmoji('✅')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('antileak:help')
        .setLabel('Aide')
        .setEmoji('❓')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/**
 * Sous-panel whitelist.
 */
function renderAntileakWhitelistPanel(guildId) {
  const whitelist = getWhitelistRoles(guildId);

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# ✅ Whitelist Anti-Leak'),
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
        .setCustomId('antileak:whitelist_add')
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
          .setCustomId('antileak:whitelist_remove')
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
        .setCustomId('antileak:back_main')
        .setLabel('Retour')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderAntileakPanel, renderAntileakWhitelistPanel };
