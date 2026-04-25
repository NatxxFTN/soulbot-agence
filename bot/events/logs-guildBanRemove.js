'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'guildBanRemove',

  async execute(ban) {
    const guild = ban.guild;

    await L.log(guild, 'member_unban', {
      description: `${ban.user.tag} a été débanni du serveur.`,
      fields: [
        { name: 'Utilisateur', value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
      ],
      summary: `${ban.user.tag} débanni`,
    });
  },
};
