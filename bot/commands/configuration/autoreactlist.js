'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/autoreact-storage');

module.exports = {
  name       : 'autoreactlist',
  aliases    : ['areactlist'],
  category   : 'configuration',
  description: 'Liste toutes les auto-réactions configurées sur le serveur.',
  usage      : ';autoreactlist',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

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

    const rows = storage.listAutoreacts(message.guild.id);
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ui_folder')} **Auto-réactions actives** · ${rows.length}`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (rows.length === 0) {
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Aucune configuration. Ajoute avec \`;autoreact add #salon emoji1 [emoji2] [emoji3]\`.`,
      ));
    } else {
      const lines = rows.map(r => {
        const emojis = (r.emojis || []).join(' ') || '*(aucun)*';
        return `<#${r.channel_id}> · ${emojis}`;
      });
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    }

    return message.reply({
      components: [ct],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
