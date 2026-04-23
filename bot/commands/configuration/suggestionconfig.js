'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelSelectMenuBuilder, RoleSelectMenuBuilder, StringSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/suggestion-storage');

function buildPanel(guild) {
  const cfg = storage.getConfig(guild.id) || {};
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_configuration')} **Configuration · Suggestions**`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const ch = cfg.channel_id ? `<#${cfg.channel_id}>` : '*(aucun)*';
  const appCh = cfg.approved_channel_id ? `<#${cfg.approved_channel_id}>` : '*(aucun — optionnel)*';
  const role = cfg.staff_role_id ? `<@&${cfg.staff_role_id}>` : '*(aucun)*';
  const anon = cfg.anonymous_allowed ? `${e('btn_success')} autorisé` : `${e('btn_error')} refusé`;
  const appro = cfg.require_approval ? `${e('btn_success')} oui` : `${e('btn_error')} non`;

  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `**Salon des suggestions** · ${ch}\n` +
    `**Salon des approuvées** · ${appCh}\n` +
    `**Rôle staff** · ${role}\n` +
    `**Anonymat** · ${anon}\n` +
    `**Approbation requise** · ${appro}\n` +
    `**Cooldown** · ${cfg.cooldown_seconds || 300}s`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const chSelect = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('suggconfig:set_channel')
      .setPlaceholder('Salon des suggestions')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1).setMaxValues(1),
  );
  const appSelect = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('suggconfig:set_approved')
      .setPlaceholder('Salon des approuvées (optionnel)')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(0).setMaxValues(1),
  );
  const roleSelect = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('suggconfig:set_staff_role')
      .setPlaceholder('Rôle staff (approbation)')
      .setMinValues(0).setMaxValues(1),
  );
  const cdSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('suggconfig:set_cooldown')
      .setPlaceholder('Cooldown entre suggestions')
      .addOptions(
        { label: '1 minute',   value: '60'   },
        { label: '5 minutes',  value: '300'  },
        { label: '10 minutes', value: '600'  },
        { label: '30 minutes', value: '1800' },
        { label: '1 heure',    value: '3600' },
      ),
  );
  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('suggconfig:toggle_anonymous')
      .setLabel(cfg.anonymous_allowed ? 'Désactiver anonymat' : 'Activer anonymat')
      .setStyle(cfg.anonymous_allowed ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('suggconfig:toggle_approval')
      .setLabel(cfg.require_approval ? 'Approbation : OFF' : 'Approbation : ON')
      .setStyle(cfg.require_approval ? ButtonStyle.Secondary : ButtonStyle.Primary),
  );

  ct.addActionRowComponents(chSelect);
  ct.addActionRowComponents(appSelect);
  ct.addActionRowComponents(roleSelect);
  ct.addActionRowComponents(cdSelect);
  ct.addActionRowComponents(toggles);

  return { container: ct, rows: [chSelect, appSelect, roleSelect, cdSelect, toggles] };
}

module.exports = {
  name       : 'suggestionconfig',
  aliases    : ['suggcfg', 'suggconfig'],
  category   : 'configuration',
  description: 'Configure le système de suggestions (salon, staff, cooldown).',
  usage      : ';suggestionconfig',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  buildPanel,

  async execute(message, _args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} Permission requise : **Gérer le serveur**.`,
      ));
      return message.reply({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false },
      }).catch(() => {});
    }

    const { container, rows } = buildPanel(message.guild);
    return message.reply({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
