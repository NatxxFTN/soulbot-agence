'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const { renderCustomPanel } = require('../../ui/panels/custom-panel');

module.exports = {
  name       : 'custom',
  aliases    : ['customs', 'customcmd'],
  category   : 'configuration',
  description: 'Panel central de gestion des commandes custom.',
  usage      : ';custom',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, _args, client) {
    const guildId = message.guild.id;

    if (!ac.hasAccess(guildId, message.author.id)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Accès refusé** — Niveau Owner+ requis.`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const panel = renderCustomPanel(message.guild, 0, client);
    await message.reply({
      components: [panel],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
