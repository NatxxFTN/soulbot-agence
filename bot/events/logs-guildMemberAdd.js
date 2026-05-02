'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'guildMemberAdd',

  async execute(member) {
    L.log(member.guild, 'member_join', {
      user   : member.user,
      member : member,
      summary: `${member.user.tag} a rejoint`,
      actorId: member.id,
    });
  },
};
