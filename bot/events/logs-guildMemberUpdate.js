'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'guildMemberUpdate',

  async execute(oldMember, newMember) {
    if (!newMember.guild) return;

    // ── Pseudo modifié ───────────────────────────────────────────────
    if (oldMember.nickname !== newMember.nickname) {
      L.log(newMember.guild, 'member_nickname_change', {
        user        : newMember.user,
        member      : newMember,
        oldNickname : oldMember.nickname,
        newNickname : newMember.nickname,
        summary     : `${newMember.user.tag} : ${oldMember.nickname || oldMember.user.username} → ${newMember.nickname || newMember.user.username}`,
        actorId     : newMember.id,
      });
    }

    // ── Boost ajouté ────────────────────────────────────────────────
    if (!oldMember.premiumSince && newMember.premiumSince) {
      L.log(newMember.guild, 'boost_add', {
        user   : newMember.user,
        member : newMember,
        summary: `${newMember.user.tag} a boost le serveur`,
        actorId: newMember.id,
      });
    }
  },
};
