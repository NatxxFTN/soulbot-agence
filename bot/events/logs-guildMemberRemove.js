'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'guildMemberRemove',

  async execute(member) {
    L.log(member.guild, 'member_leave', {
      user   : member.user,
      member : member,
      summary: `${member.user?.tag || 'Inconnu'} a quitté`,
      actorId: member.id,
    });
  },
};
