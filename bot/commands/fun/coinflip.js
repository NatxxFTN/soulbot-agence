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
  name      : 'coinflip',
  aliases   : ['pile', 'face', 'coin'],
  description: 'Lance une pièce : Pile ou Face.',
  usage     : ';coinflip',
  cooldown  : 2,

  guildOnly  : true,

  async execute(message) {
    const msg = await message.channel.send({
      components: [panel(`${e('ani_coin')} **La pièce tourne...**`)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
    await new Promise(r => setTimeout(r, 2000));
    const result = Math.random() < 0.5 ? 'Pile' : 'Face';
    await msg.edit({
      components: [panel(`${e('ani_coin')} **Résultat**`, `Résultat : **${result}** !`)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
