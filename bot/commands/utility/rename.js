'use strict';

const {
  PermissionFlagsBits, ChannelType,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'rename',
  aliases    : ['renommer'],
  category   : 'utility',
  description: 'Renomme un salon textuel ou vocal.',
  usage      : ';rename [#salon] <nouveau nom>',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les salons**.')] });
    }

    let channel = message.mentions.channels.first() ?? message.channel;
    let nameParts = args;
    if (message.mentions.channels.size > 0) nameParts = args.slice(1);

    const newName = nameParts.join('-').replace(/\s+/g, '-').slice(0, 100);
    if (!newName) {
      return message.reply({ embeds: [E.error('Nom manquant', 'Fournis un nouveau nom pour le salon.')] });
    }

    const validTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice, ChannelType.GuildForum];
    if (!validTypes.includes(channel.type)) {
      return message.reply({ embeds: [E.error('Salon invalide', 'Ce type de salon ne peut pas être renommé ainsi.')] });
    }

    const loadingCt = new ContainerBuilder().setAccentColor(0xFF0000);
    loadingCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_loading')} Renommage en cours...`));
    const loadingMsg = await message.reply({
      components: [loadingCt],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });

    try {
      if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
        throw new Error('no_perm');
      }

      const oldName = channel.name;
      await channel.setName(newName, `Rename par ${message.author.tag}`);

      const ts = Math.floor(Date.now() / 1000);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Salon renommé**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_chat')} Salon : ${channel}\n` +
        `${e('ui_user')} Par : ${message.author}\n` +
        `${e('ui_pin')} Date : <t:${ts}:R>`
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_success')} \`${oldName}\` → \`${newName}\``
      ));
      await loadingMsg.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 });

    } catch {
      const errCt = new ContainerBuilder().setAccentColor(0xFF0000);
      errCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Erreur** — Je n'ai pas la permission de renommer ce salon.`));
      await loadingMsg.edit({ components: [errCt], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
