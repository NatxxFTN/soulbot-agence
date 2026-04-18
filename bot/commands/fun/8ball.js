'use strict';

const E = require('../../utils/embeds');

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

module.exports = {
  name      : '8ball',
  aliases   : ['boule', 'magic'],
  description: 'Pose une question à la boule magique.',
  usage     : ';8ball <question>',
  cooldown  : 3,

  async execute(message, args) {
    const question = args.join(' ').trim();
    if (!question) {
      return message.reply({ embeds: [E.error('Question manquante', 'Pose une question : `;8ball <question>`')] });
    }

    const pick  = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
    const embed = E[pick.type]('Boule Magique', pick.text)
      .addFields({ name: 'Question', value: question, inline: false });

    message.channel.send({ embeds: [embed] });
  },
};
