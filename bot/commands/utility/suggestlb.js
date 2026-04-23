'use strict';

const {
  MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/suggestion-storage');

module.exports = {
  name       : 'suggestlb',
  aliases    : ['suggtop', 'suggestionlb'],
  category   : 'utility',
  description: 'Top 10 des suggestions les plus votées du serveur.',
  usage      : ';suggestlb',
  cooldown   : 5,
  guildOnly  : true,
  permissions: [],

  async execute(message, _args, _client) {
    const top = storage.listTop(message.guild.id, 10);
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_information')} **Top 10 des suggestions**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (top.length === 0) {
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Aucune suggestion pour l'instant.`,
      ));
    } else {
      const medals = ['🥇', '🥈', '🥉'];
      const lines = top.map((s, i) => {
        const rank = medals[i] || `**#${i + 1}**`;
        const content = s.content.length > 80 ? s.content.slice(0, 77) + '…' : s.content;
        return `${rank} 👍 **${s.upvotes}** 👎 **${s.downvotes}** · ${content}`;
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
