'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'serverlist',
  aliases    : ['guilds'],
  description: 'Liste tous les serveurs où le bot est présent.',
  usage      : ';serverlist [page]',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const guilds    = [...client.guilds.cache.values()]
        .sort((a, b) => b.memberCount - a.memberCount);
      const perPage   = 10;
      const totalPages = Math.ceil(guilds.length / perPage);
      const page      = Math.min(Math.max(parseInt(args[0]) || 1, 1), totalPages);
      const slice     = guilds.slice((page - 1) * perPage, page * perPage);

      const lines = slice.map((g, i) => {
        const n = (page - 1) * perPage + i + 1;
        return `**${n}.** ${g.name} — \`${g.id}\` — **${g.memberCount}** membres`;
      }).join('\n');

      const totalMembers = guilds.reduce((acc, g) => acc + g.memberCount, 0);

      return message.channel.send({
        embeds: [
          E.base()
            .setTitle(`Serveurs (${guilds.length} total · ${totalMembers} membres)`)
            .setDescription(lines)
            .setFooter({ text: `Page ${page}/${totalPages} · ;serverlist [page] pour naviguer` }),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
