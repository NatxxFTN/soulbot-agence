'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'guildMemberUpdate',

  async execute(oldMember, newMember) {
    if (!newMember.guild) return;
    if (oldMember.nickname === newMember.nickname) return;

    const before = oldMember.nickname || oldMember.user.username;
    const after  = newMember.nickname || newMember.user.username;

    await L.log(newMember.guild, 'member_nickname_change', {
      description: `${newMember} a changé de pseudo.`,
      fields: [
        { name: 'Utilisateur', value: `${newMember.user.tag} (\`${newMember.id}\`)`, inline: true },
        { name: 'Avant',       value: `\`${before}\``,                               inline: true },
        { name: 'Après',       value: `\`${after}\``,                                inline: true },
      ],
      summary: `${newMember.user.tag} : ${before} → ${after}`,
    });
  },
};
