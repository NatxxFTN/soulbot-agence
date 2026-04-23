'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/twitch-storage');

module.exports = {
  name       : 'twitchlist',
  aliases    : ['twlist'],
  category   : 'utility',
  description: 'Liste les streamers Twitch suivis sur ce serveur.',
  usage      : ';twitchlist',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, _args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} Permission requise.`,
      ));
      return message.reply({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false },
      }).catch(() => {});
    }

    const list = storage.listStreamers(message.guild.id);
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ui_folder')} **Streamers Twitch suivis** · ${list.length}`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (list.length === 0) {
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Aucun streamer. Ajoute avec \`;twitch add <pseudo>\`.`,
      ));
    } else {
      const lines = list.map(s => {
        const last = s.last_live_at ? `<t:${Math.floor(s.last_live_at / 1000)}:R>` : 'jamais';
        return `• **${s.display_name || s.twitch_username}** · dernier live : ${last}`;
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
