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
const { getModConfig } = require('../../core/mod-helper');

const st = (on) => on ? '🟢' : '🔴';

function fmtDuration(secs) {
  if (!secs) return 'Non définie';
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}j`;
  if (h >= 1) return `${h}h`;
  return `${m}min`;
}

function renderModconfigPanel(guildId) {
  const cfg = getModConfig(guildId) || {};

  const logsId    = cfg.logs_channel_id;
  const modRoleId = cfg.mod_role_id;
  const mutedRole = cfg.muted_role_id;
  const muteDur   = cfg.default_mute_duration    ?? 600;
  const toutDur   = cfg.default_timeout_duration ?? 600;
  const dmOn      = cfg.dm_sanctioned !== 0;
  const reasonOn  = !!cfg.require_reason;

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  // ── Titre ────────────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🔨 Configuration Modération'),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Salon logs ───────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📝 **Salon logs** : ${logsId ? `<#${logsId}>` : '*Non défini*'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('modconfig:logs_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!logsId),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('modconfig:logs')
        .setPlaceholder('Sélectionner un salon de logs')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(1).setMaxValues(1),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Rôle modérateur ──────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🛡️ **Rôle modérateur** : ${modRoleId ? `<@&${modRoleId}>` : '*Non défini*'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('modconfig:mod_role_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!modRoleId),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('modconfig:mod_role')
        .setPlaceholder('Sélectionner le rôle modérateur')
        .setMinValues(1).setMaxValues(1),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Rôle muted ───────────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🔇 **Rôle muted** : ${mutedRole ? `<@&${mutedRole}>` : '*Non défini*'}\n` +
          `*Le rôle attribué lors d'un mute manuel. Pour le timeout Discord, non requis.*`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('modconfig:muted_role_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!mutedRole),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('modconfig:muted_role')
        .setPlaceholder('Sélectionner le rôle muted')
        .setMinValues(1).setMaxValues(1),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Durées par défaut ─────────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ **Durée mute par défaut** : \`${fmtDuration(muteDur)}\` (${muteDur}s)`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('modconfig:mute_dur_modal')
          .setLabel('Modifier')
          .setStyle(ButtonStyle.Secondary),
      ),
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ **Durée timeout par défaut** : \`${fmtDuration(toutDur)}\` (${toutDur}s)\n` +
          `*Max Discord : 28 jours (2419200s)*`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('modconfig:timeout_dur_modal')
          .setLabel('Modifier')
          .setStyle(ButtonStyle.Secondary),
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
          `${st(dmOn)} **DM le membre sanctionné** — ${dmOn ? 'Activé' : 'Désactivé'}\n` +
          `*Envoie un DM au membre lors d'un ban/kick/mute/timeout*`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('modconfig:dm_toggle')
          .setLabel(dmOn ? 'Désactiver' : 'Activer')
          .setStyle(dmOn ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${st(reasonOn)} **Raison obligatoire** — ${reasonOn ? 'Activée' : 'Désactivée'}\n` +
          `*Bloque les commandes de modération sans raison fournie*`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('modconfig:reason_toggle')
          .setLabel(reasonOn ? 'Désactiver' : 'Activer')
          .setStyle(reasonOn ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Bas ──────────────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('modconfig:help')
        .setLabel('Aide')
        .setEmoji('❓')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderModconfigPanel };
