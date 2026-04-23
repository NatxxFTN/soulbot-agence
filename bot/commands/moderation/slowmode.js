'use strict';

const {
  PermissionFlagsBits, ChannelType,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

function parseTime(str) {
  if (!str) return null;
  if (str === 'off' || str === '0') return 0;
  const match = str.match(/^(\d+)(s|m|h)?$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  if (unit === 'h') return n * 3600;
  if (unit === 'm') return n * 60;
  return n;
}

function formatDuration(seconds) {
  if (seconds === 0) return 'désactivé';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

module.exports = {
  name       : 'slowmode',
  aliases    : ['slow', 'lent'],
  category   : 'moderation',
  description: 'Configure le mode lent d\'un salon (ex: 30s, 5m, 1h, off).',
  usage      : ';slowmode [#salon] <durée|off>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les salons**.')] });
    }

    let channel = message.mentions.channels.first() ?? message.channel;
    let rawTime = args[0];

    if (message.mentions.channels.size > 0) rawTime = args[1];

    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
      return message.reply({ embeds: [E.error('Salon invalide', 'Spécifie un salon textuel valide.')] });
    }

    const seconds = parseTime(rawTime);
    if (seconds === null || seconds > 21600) {
      return message.reply({ embeds: [E.error('Durée invalide', 'Utilise un format valide : `30s`, `5m`, `1h`, `off`. Maximum : 6h.')] });
    }

    const loadingCt = new ContainerBuilder().setAccentColor(0xFF0000);
    loadingCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_loading')} Application du mode lent...`));
    const loadingMsg = await message.reply({
      components: [loadingCt],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });

    try {
      if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
        throw new Error('no_perm');
      }

      await channel.setRateLimitPerUser(seconds, `Slowmode par ${message.author.tag}`);

      const ts = Math.floor(Date.now() / 1000);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Mode lent configuré**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_chat')} Salon : ${channel}\n` +
        `${e('ui_user')} Par : ${message.author}\n` +
        `${e('ui_pin')} Date : <t:${ts}:R>`
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        seconds === 0
          ? `${e('btn_success')} Mode lent **désactivé**.`
          : `${e('btn_success')} Mode lent réglé à **${formatDuration(seconds)}**.`
      ));
      await loadingMsg.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 });

    } catch {
      const errCt = new ContainerBuilder().setAccentColor(0xFF0000);
      errCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Erreur** — Je n'ai pas la permission de modifier ce salon.`));
      await loadingMsg.edit({ components: [errCt], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
