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
const storage = require('../../core/pairup-storage');

function buildPanel(guild) {
  const cfg = storage.getConfig(guild.id) || {};
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_configuration')} **Configuration · Pairup**`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const ch = cfg.channel_id ? `<#${cfg.channel_id}>` : '*(aucun)*';
  const role = cfg.role_id ? `<@&${cfg.role_id}>` : '*(aucun)*';
  const freq = { daily: 'Quotidien', weekly: 'Hebdomadaire', monthly: 'Mensuel' }[cfg.frequency] || 'Hebdomadaire';
  const lastRun = cfg.last_run_at
    ? `<t:${Math.floor(cfg.last_run_at / 1000)}:R>`
    : '*(jamais)*';

  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `**Salon** · ${ch}\n` +
    `**Rôle cible** · ${role}\n` +
    `**Fréquence** · ${freq}\n` +
    `**Dernier tour** · ${lastRun}\n` +
    `**Statut** · ${cfg.enabled ? `${e('btn_success')} actif` : `${e('btn_error')} désactivé`}`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const chSelect = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('pairupcfg:set_channel')
      .setPlaceholder('Salon des matchs')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1).setMaxValues(1),
  );
  const roleSelect = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('pairupcfg:set_role')
      .setPlaceholder('Rôle des participants')
      .setMinValues(1).setMaxValues(1),
  );
  const freqSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('pairupcfg:set_frequency')
      .setPlaceholder('Fréquence')
      .addOptions(
        { label: 'Quotidien',    value: 'daily',   default: cfg.frequency === 'daily' },
        { label: 'Hebdomadaire', value: 'weekly',  default: cfg.frequency === 'weekly' || !cfg.frequency },
        { label: 'Mensuel',      value: 'monthly', default: cfg.frequency === 'monthly' },
      ),
  );
  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pairupcfg:toggle_enabled')
      .setLabel(cfg.enabled ? 'Système : ON' : 'Système : OFF')
      .setStyle(cfg.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  ct.addActionRowComponents(chSelect);
  ct.addActionRowComponents(roleSelect);
  ct.addActionRowComponents(freqSelect);
  ct.addActionRowComponents(toggles);

  return { container: ct, rows: [chSelect, roleSelect, freqSelect, toggles] };
}

module.exports = {
  name       : 'pairupconfig',
  aliases    : ['pairupcfg', 'matchconfig'],
  category   : 'configuration',
  description: 'Configure le système de matchmaking (pairup).',
  usage      : ';pairupconfig',
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
