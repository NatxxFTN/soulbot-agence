'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/tempvoc-storage');

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

module.exports = {
  name       : 'tempvoc',
  aliases    : ['tvc', 'tempvocconfig'],
  category   : 'configuration',
  description: 'Configure le système de salons vocaux temporaires (hub + templates).',
  usage      : ';tempvoc',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, _args, _client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const { renderTempvocPanel } = require('../../ui/panels/tempvoc-panel');
    const panel = renderTempvocPanel(message.guild);
    await message.reply({
      components: [panel],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
