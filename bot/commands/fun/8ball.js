'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

const RESPONSES = [
  { text: 'Absolument.',          type: 'success' },
  { text: "C'est certain.",       type: 'success' },
  { text: 'Sans aucun doute.',    type: 'success' },
  { text: 'Oui, définitivement.', type: 'success' },
  { text: 'Tu peux compter dessus.', type: 'success' },
  { text: 'Difficile à dire.',    type: 'warning' },
  { text: 'Demande plus tard.',   type: 'warning' },
  { text: 'Impossible de prédire.', type: 'warning' },
  { text: "N'y compte pas trop.", type: 'error'   },
  { text: 'Ma réponse est non.',  type: 'error'   },
  { text: 'Mes sources disent non.', type: 'error' },
  { text: 'Les perspectives sont mauvaises.', type: 'error' },
];

function panel(iconName, title, body) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e(iconName)} **${title}**`));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  return container;
}

function iconForType(type) {
  if (type === 'success') return 'btn_success';
  if (type === 'warning') return 'btn_tip';
  if (type === 'error') return 'btn_error';
  return 'cat_information';
}

module.exports = {
  name      : '8ball',
  aliases   : ['boule', 'magic'],
  description: 'Pose une question à la boule magique.',
  usage     : ';8ball <question>',
  cooldown  : 3,

  guildOnly  : true,

  async execute(message, args) {
    const question = args.join(' ').trim();
    if (!question) {
      return message.reply({
        components: [panel('btn_error', 'Question manquante', 'Pose une question : `;8ball <question>`')],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    const pick  = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
    const body = `${pick.text}\n\n**Question**\n${question}`;

    message.channel.send({
      components: [panel(iconForType(pick.type), 'Boule Magique', body)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
