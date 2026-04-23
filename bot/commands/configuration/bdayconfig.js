'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelSelectMenuBuilder, RoleSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/bday-storage');

function buildPanel(guild) {
  const cfg = storage.getConfig(guild.id) || {};
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_configuration')} **Configuration · Anniversaires**`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const ch = cfg.announcement_channel ? `<#${cfg.announcement_channel}>` : '*(aucun)*';
  const role = cfg.role_id ? `<@&${cfg.role_id}>` : '*(aucun)*';
  const tpl = cfg.message_template || '*(défaut)*';
  const shortTpl = tpl.length > 120 ? tpl.slice(0, 120) + '…' : tpl;

  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `**Salon d'annonce** · ${ch}\n` +
    `**Rôle anniversaire** · ${role}\n` +
    `**Ping @everyone** · ${cfg.ping_everyone ? `${e('btn_success')} oui` : `${e('btn_error')} non`}\n` +
    `**Système** · ${cfg.enabled ? `${e('btn_success')} actif` : `${e('btn_error')} désactivé`}\n\n` +
    `**Message** · \`${shortTpl}\``,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const chSelect = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('bdaycfg:set_channel')
      .setPlaceholder('Salon d\'annonce')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1).setMaxValues(1),
  );
  const roleSelect = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('bdaycfg:set_role')
      .setPlaceholder('Rôle anniversaire (optionnel)')
      .setMinValues(0).setMaxValues(1),
  );
  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bdaycfg:toggle_enabled')
      .setLabel(cfg.enabled ? 'Système : ON' : 'Système : OFF')
      .setStyle(cfg.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('bdaycfg:toggle_ping')
      .setLabel(cfg.ping_everyone ? 'Ping everyone : ON' : 'Ping everyone : OFF')
      .setStyle(cfg.ping_everyone ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('bdaycfg:edit_template')
      .setLabel('Modifier le message')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
  );

  ct.addActionRowComponents(chSelect);
  ct.addActionRowComponents(roleSelect);
  ct.addActionRowComponents(toggles);

  return { container: ct, rows: [chSelect, roleSelect, toggles] };
}

module.exports = {
  name       : 'bdayconfig',
  aliases    : ['bdaycfg', 'birthdayconfig'],
  category   : 'configuration',
  description: 'Configure les annonces d\'anniversaires.',
  usage      : ';bdayconfig',
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
