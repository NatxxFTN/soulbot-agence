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
const storage = require('../../core/twitch-storage');
const api = require('../../core/twitch-api');

function buildPanel(guild) {
  const cfg = storage.getConfig(guild.id) || {};
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_configuration')} **Configuration · Notifications Twitch**`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const credOk = api.hasCredentials();
  const credLine = credOk
    ? `${e('btn_success')} Clés API détectées`
    : `${e('btn_error')} Clés API manquantes — renseigne \`TWITCH_CLIENT_ID\` et \`TWITCH_CLIENT_SECRET\` dans \`.env\``;

  const ch = cfg.channel_id ? `<#${cfg.channel_id}>` : '*(aucun)*';
  const role = cfg.ping_role_id ? `<@&${cfg.ping_role_id}>` : '*(aucun)*';
  const enabled = cfg.enabled ? `${e('btn_success')} activé` : `${e('btn_error')} désactivé`;

  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${credLine}\n\n` +
    `**État** · ${enabled}\n` +
    `**Salon d'annonce** · ${ch}\n` +
    `**Rôle pingé** · ${role}\n` +
    `**Template** · \`${(cfg.message_template || '').split('\n')[0]}\``,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const chSel = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('twcfg:set_channel')
      .setPlaceholder('Salon d\'annonce')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(0).setMaxValues(1),
  );
  const roleSel = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('twcfg:set_role')
      .setPlaceholder('Rôle à ping')
      .setMinValues(0).setMaxValues(1),
  );
  const btns = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('twcfg:edit_template')
      .setLabel('Modifier le message')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('twcfg:toggle_enabled')
      .setLabel(cfg.enabled ? 'Désactiver' : 'Activer')
      .setStyle(cfg.enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
  );

  ct.addActionRowComponents(chSel);
  ct.addActionRowComponents(roleSel);
  ct.addActionRowComponents(btns);

  return { container: ct, rows: [chSel, roleSel, btns] };
}

module.exports = {
  name       : 'twitchconfig',
  aliases    : ['twcfg', 'twconfig'],
  category   : 'configuration',
  description: 'Configure les notifications Twitch (salon, rôle, template).',
  usage      : ';twitchconfig',
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
