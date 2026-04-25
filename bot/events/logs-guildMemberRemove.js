'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'guildMemberRemove',

  async execute(member) {
    if (member.user?.bot) return;

    const joinedTs = member.joinedTimestamp;
    const durationDisplay = joinedTs
      ? `<t:${Math.floor(joinedTs / 1000)}:R>`
      : '*inconnu*';

    await L.log(member.guild, 'member_leave', {
      description: `${member.user.tag} a quitté le serveur.`,
      fields: [
        { name: 'Utilisateur', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: 'A rejoint',   value: durationDisplay,                          inline: true },
        { name: 'Membres',     value: `${member.guild.memberCount}`,            inline: true },
      ],
      summary: `${member.user.tag} a quitté`,
    });
  },
};
