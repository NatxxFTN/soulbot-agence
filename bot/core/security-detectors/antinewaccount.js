'use strict';

// ── Détecteur antinewaccount — via guildMemberAdd (pas messageCreate) ────────
// threshold = nombre de jours minimum requis (ex: 7 = compte doit avoir ≥7j).

module.exports = {
  async check(_message, _config) {
    return { triggered: false }; // pas utilisé côté message
  },

  async checkNewMember(member, config) {
    const minDays    = Number(config?.threshold) || 7;
    const ageMs      = Date.now() - member.user.createdTimestamp;
    const ageDaysNum = ageMs / (1000 * 60 * 60 * 24);

    if (ageDaysNum < minDays) {
      return {
        triggered     : true,
        reason        : `Compte trop récent (${Math.floor(ageDaysNum)}j, min ${minDays}j)`,
        accountAgeDays: Math.floor(ageDaysNum),
      };
    }
    return { triggered: false };
  },
};
