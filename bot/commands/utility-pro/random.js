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

function replyPanel(message, title, body) {
  return message.reply({
    components: [panel(title, body)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
}

module.exports = {
  name       : 'random',
  aliases    : ['rand', 'aleatoire'],
  description: 'Nombre aléatoire entre min et max (inclus).',
  usage      : ';random <min> <max>',
  cooldown   : 2,
  guildOnly  : false,

  async execute(message, args) {
    const min = parseInt(args[0], 10);
    const max = parseInt(args[1], 10);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      return replyPanel(message, `${e('btn_error')} **Usage**`, '`;random <min> <max>`');
    }
    if (min >= max) return replyPanel(message, `${e('btn_error')} **Invalide**`, 'min doit être < max.');

    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    return replyPanel(message, `${e('ani_dice')} **Random**`, `Entre **${min}** et **${max}** : **${result}**`);
  },
};
