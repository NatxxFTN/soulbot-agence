'use strict';

const {
  PermissionFlagsBits, ChannelType,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'unlock',
  aliases    : ['deverrouiller'],
  category   : 'moderation',
  description: 'Déverrouille un salon pour permettre aux membres d\'écrire à nouveau.',
  usage      : ';unlock [#salon]',
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
    loadingCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_loading')} Déverrouillage en cours...`));
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
        { SendMessages: null },
        { reason: `Unlock par ${message.author.tag}` }
      );

      const ts = Math.floor(Date.now() / 1000);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Salon déverrouillé**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_unlock')} Salon : ${channel}\n` +
        `${e('ui_user')} Déverrouillé par : ${message.author}\n` +
        `${e('ui_pin')} Date : <t:${ts}:R>`
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_success')} Les membres peuvent à nouveau écrire.`));
      await loadingMsg.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 });

    } catch (err) {
      console.error('[unlock] Erreur:', err);
      const errCt = new ContainerBuilder().setAccentColor(0xFF0000);
      const detail = err?.message && err.message !== 'no_perm' ? ` (\`${err.message}\`)` : '';
      errCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Erreur** — Impossible de déverrouiller ce salon.${detail}`));
      await loadingMsg.edit({ components: [errCt], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
