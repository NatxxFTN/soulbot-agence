'use strict';

// ── Détecteur antieveryone — @everyone / @here non-autorisés ─────────────────
// N'applique pas aux membres ayant la permission MentionEveryone.

const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  async check(message, _config) {
    if (!message.mentions.everyone) return { triggered: false };

    if (message.member?.permissions.has(PermissionFlagsBits.MentionEveryone)) {
      return { triggered: false };
    }

    const hasEveryone = /@everyone/i.test(message.content);
    const hasHere     = /@here/i.test(message.content);
    if (!hasEveryone && !hasHere) return { triggered: false };

    return {
      triggered: true,
      reason   : hasEveryone ? '@everyone non-autorisé' : '@here non-autorisé',
    };
  },
};
