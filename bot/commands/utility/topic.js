'use strict';

const {
  PermissionFlagsBits, ChannelType,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'topic',
  aliases    : ['settopic', 'sujet'],
  category   : 'utility',
  description: 'Définit ou efface le sujet d\'un salon textuel.',
  usage      : ';topic [#salon] <texte> — sans texte = efface',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les salons**.')] });
    }

    let channel = message.mentions.channels.first() ?? message.channel;
    let textParts = args;
    if (message.mentions.channels.size > 0) textParts = args.slice(1);

    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
      return message.reply({ embeds: [E.error('Salon invalide', 'Spécifie un salon textuel valide.')] });
    }

    const newTopic = textParts.join(' ').slice(0, 1024) || null;

    const loadingCt = new ContainerBuilder().setAccentColor(0xFF0000);
    loadingCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_loading')} Mise à jour du sujet...`));
    const loadingMsg = await message.reply({
      components: [loadingCt],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });

    try {
      if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
        throw new Error('no_perm');
      }

      await channel.setTopic(newTopic, `Topic par ${message.author.tag}`);

      const ts = Math.floor(Date.now() / 1000);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Sujet mis à jour**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_chat')} Salon : ${channel}\n` +
        `${e('ui_user')} Par : ${message.author}\n` +
        `${e('ui_pin')} Date : <t:${ts}:R>`
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        newTopic
          ? `${e('btn_success')} Sujet : *${newTopic}*`
          : `${e('btn_success')} Sujet effacé.`
      ));
      await loadingMsg.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 });

    } catch {
      const errCt = new ContainerBuilder().setAccentColor(0xFF0000);
      errCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Erreur** — Je n'ai pas la permission de modifier ce salon.`));
      await loadingMsg.edit({ components: [errCt], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
