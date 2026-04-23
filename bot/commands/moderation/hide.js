'use strict';

const {
  PermissionFlagsBits, ChannelType,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'hide',
  aliases    : ['masquer', 'invisible'],
  category   : 'moderation',
  description: 'Masque un salon pour le rendre invisible aux membres.',
  usage      : ';hide [#salon]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les salons**.')] });
    }

    const channel = message.mentions.channels.first()
      ?? (args[0] ? message.guild.channels.cache.get(args[0]) : null)
      ?? message.channel;

    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
      return message.reply({ embeds: [E.error('Salon invalide', 'Spécifie un salon textuel valide.')] });
    }

    const loadingCt = new ContainerBuilder().setAccentColor(0xFF0000);
    loadingCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_loading')} Masquage en cours...`));
    const loadingMsg = await message.reply({
      components: [loadingCt],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });

    try {
      if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
        throw new Error('no_perm');
      }

      await channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { ViewChannel: false },
        { reason: `Hide par ${message.author.tag}` }
      );

      const ts = Math.floor(Date.now() / 1000);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Salon masqué**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_eye')} Salon : ${channel}\n` +
        `${e('ui_user')} Masqué par : ${message.author}\n` +
        `${e('ui_pin')} Date : <t:${ts}:R>`
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_success')} Le salon est maintenant invisible pour les membres.`));
      await loadingMsg.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 });

    } catch {
      const errCt = new ContainerBuilder().setAccentColor(0xFF0000);
      errCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Erreur** — Je n'ai pas la permission de masquer ce salon.`));
      await loadingMsg.edit({ components: [errCt], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
