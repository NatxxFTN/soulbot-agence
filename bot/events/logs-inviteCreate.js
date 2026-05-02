'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'inviteCreate',

  async execute(invite) {
    if (!invite.guild) return;

    L.log(invite.guild, 'invite_create', {
      code            : invite.code,
      inviter         : invite.inviter,
      channelId       : invite.channelId || invite.channel?.id,
      maxUses         : invite.maxUses,
      maxAge          : invite.maxAge,
      expiresTimestamp: invite.expiresTimestamp,
      temporary       : invite.temporary,
      summary         : `Invite créée par ${invite.inviter?.tag || 'inconnu'}: ${invite.code}`,
      actorId         : invite.inviter?.id || null,
      channelId       : invite.channelId,
    });
  },
};
