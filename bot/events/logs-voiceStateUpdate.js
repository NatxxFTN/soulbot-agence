'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'voiceStateUpdate',

  async execute(oldState, newState) {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const guild = newState.guild ?? oldState.guild;
    if (!guild) return;

    const wasIn = oldState.channelId !== null;
    const isIn  = newState.channelId !== null;

    // ── Entrée vocal ─────────────────────────────────────────────────────────
    if (!wasIn && isIn) {
      await L.log(guild, 'voice_join', {
        description: `${member} a rejoint un salon vocal.`,
        fields: [
          { name: 'Membre', value: `${member.user.tag} (\`${member.id}\`)`,                      inline: true },
          { name: 'Salon',  value: `<#${newState.channelId}>`,                                  inline: true },
        ],
        summary: `${member.user.tag} → #${newState.channel?.name ?? '?'}`,
      });
      return;
    }

    // ── Sortie vocal ─────────────────────────────────────────────────────────
    if (wasIn && !isIn) {
      await L.log(guild, 'voice_leave', {
        description: `${member} a quitté le vocal.`,
        fields: [
          { name: 'Membre', value: `${member.user.tag} (\`${member.id}\`)`,                      inline: true },
          { name: 'Salon',  value: `<#${oldState.channelId}>`,                                  inline: true },
        ],
        summary: `${member.user.tag} a quitté #${oldState.channel?.name ?? '?'}`,
      });
      return;
    }

    // ── Déplacement vocal ────────────────────────────────────────────────────
    if (wasIn && isIn && oldState.channelId !== newState.channelId) {
      await L.log(guild, 'voice_move', {
        description: `${member} a changé de salon vocal.`,
        fields: [
          { name: 'Membre', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
          { name: 'De',     value: `<#${oldState.channelId}>`,              inline: true },
          { name: 'Vers',   value: `<#${newState.channelId}>`,              inline: true },
        ],
        summary: `${member.user.tag} : #${oldState.channel?.name ?? '?'} → #${newState.channel?.name ?? '?'}`,
      });
    }
  },
};
