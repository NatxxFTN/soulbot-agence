'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'voiceStateUpdate',

  async execute(oldState, newState) {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const guild = newState.guild ?? oldState.guild;
    if (!guild) return;

    const wasIn = oldState.channelId !== null;
    const isIn  = newState.channelId !== null;

    if (!wasIn && isIn) {
      L.log(guild, 'voice_join', {
        user        : member.user,
        member,
        channelId   : newState.channelId,
        channelName : newState.channel?.name,
        summary     : `${member.user.tag} → #${newState.channel?.name ?? '?'}`,
        actorId     : member.id,
      });
      return;
    }

    if (wasIn && !isIn) {
      L.log(guild, 'voice_leave', {
        user        : member.user,
        member,
        channelId   : oldState.channelId,
        channelName : oldState.channel?.name,
        summary     : `${member.user.tag} a quitté #${oldState.channel?.name ?? '?'}`,
        actorId     : member.id,
      });
      return;
    }

    if (wasIn && isIn && oldState.channelId !== newState.channelId) {
      L.log(guild, 'voice_move', {
        user          : member.user,
        member,
        fromChannelId : oldState.channelId,
        fromName      : oldState.channel?.name,
        toChannelId   : newState.channelId,
        toName        : newState.channel?.name,
        summary       : `${member.user.tag} : #${oldState.channel?.name ?? '?'} → #${newState.channel?.name ?? '?'}`,
        actorId       : member.id,
      });
    }
  },
};
