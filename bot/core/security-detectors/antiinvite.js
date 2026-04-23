'use strict';

// ── Détecteur antiinvite — Invitations Discord (g/gg/com/me/li/invite.gg) ─────

const INVITE_PATTERNS = [
  /discord(?:app)?\.com\/invite\/[\w-]+/i,
  /discord\.gg\/[\w-]+/i,
  /dsc\.gg\/[\w-]+/i,
  /discord\.me\/[\w-]+/i,
  /discord\.li\/[\w-]+/i,
  /invite\.gg\/[\w-]+/i,
];

module.exports = {
  async check(message, _config) {
    const content = message.content;
    if (!content) return { triggered: false };

    for (const pattern of INVITE_PATTERNS) {
      const m = content.match(pattern);
      if (m) {
        return {
          triggered: true,
          reason   : `Invitation Discord détectée : ${m[0]}`,
        };
      }
    }
    return { triggered: false };
  },
};
