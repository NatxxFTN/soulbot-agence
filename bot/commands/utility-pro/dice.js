'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

function panel(title, body) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  return container;
}

module.exports = {
  name       : 'dice',
  aliases    : ['de', 'roll'],
  description: 'Lance un ou plusieurs dés.',
  usage      : ';dice [faces=6] [count=1]',
  cooldown   : 2,
  guildOnly  : false,

  async execute(message, args) {
    const faces = Math.max(2, Math.min(1000, parseInt(args[0], 10) || 6));
    const count = Math.max(1, Math.min(20, parseInt(args[1], 10) || 1));

    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * faces));
    const total = rolls.reduce((a, b) => a + b, 0);

    return message.reply({
      components: [panel(
        `${e('ani_dice')} **${count}d${faces}**`,
        rolls.map(r => `\`${r}\``).join(' · ') + (count > 1 ? `\n\n**Total : ${total}**` : ''),
      )],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
