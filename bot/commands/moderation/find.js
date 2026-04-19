'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'find',
  aliases    : ['vfind', 'vcfind'],
  description: 'Trouver dans quel salon vocal se trouve un membre.',
  usage      : ';find @membre',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [],

  async execute(message, args) {
    const target = message.mentions.members.first() ?? message.member;

    const vc = target.voice?.channel;

    if (!vc) {
      return message.channel.send({
        embeds: [E.info('Salon vocal', `${target} n\'est dans aucun salon vocal en ce moment.`)],
      });
    }

    const members = vc.members.map(m => m.toString()).join(', ') || '—';

    return message.channel.send({
      embeds: [
        E.base()
          .setTitle('Salon vocal — Localisation')
          .addFields(
            { name: 'Membre',       value: target.toString(),          inline: true },
            { name: 'Salon',        value: vc.toString(),              inline: true },
            { name: 'Participants', value: `${vc.members.size}`,       inline: true },
            { name: 'Membres',      value: members.slice(0, 1024) },
          ),
      ],
    });
  },
};
