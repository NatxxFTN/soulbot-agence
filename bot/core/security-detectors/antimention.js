'use strict';

// ── Détecteur antimention — spam de mentions (seuil configurable) ────────────

module.exports = {
  async check(message, config) {
    const threshold = Number(config?.threshold) || 5;

    const userMentions = message.mentions.users.size;
    const roleMentions = message.mentions.roles.size;
    const total        = userMentions + roleMentions;

    if (total < threshold) return { triggered: false };

    // La mention de reply ne compte pas comme un "vrai" spam
    const actual = total - (message.mentions.repliedUser ? 1 : 0);
    if (actual < threshold) return { triggered: false };

    return {
      triggered: true,
      reason   : `Spam de mentions (${actual} dans 1 message, seuil ${threshold})`,
    };
  },
};
