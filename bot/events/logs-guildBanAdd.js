'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'guildBanAdd',

  async execute(ban) {
    const guild = ban.guild;
    const reason = ban.reason ? ban.reason.slice(0, 1000) : '*Aucune raison fournie*';

    await L.log(guild, 'member_ban', {
      description: `${ban.user.tag} a été banni du serveur.`,
      fields: [
        { name: 'Utilisateur', value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
        { name: 'Raison',      value: reason,                                  inline: false },
      ],
      summary: `${ban.user.tag} banni — ${reason.slice(0, 60)}`,
    });
  },
};
