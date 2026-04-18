'use strict';

const { db, getGuildSettings } = require('../database');

module.exports = {
  name : 'guildMemberUpdate',

  async execute(oldMember, newMember, client) {
    const guildId = newMember.guild.id;

    // ── Rôle Boost ────────────────────────────────────────────────────────────
    const wasBooster = oldMember.premiumSince !== null;
    const isBooster  = newMember.premiumSince !== null;

    if (!wasBooster && isBooster) {
      // Vient de commencer à booster
      const settings = getGuildSettings(guildId);
      if (settings?.role_boost_id) {
        const role = newMember.guild.roles.cache.get(settings.role_boost_id);
        if (role) newMember.roles.add(role).catch(() => {});
      }
    } else if (wasBooster && !isBooster) {
      // A arrêté de booster
      const settings = getGuildSettings(guildId);
      if (settings?.role_boost_id && newMember.roles.cache.has(settings.role_boost_id)) {
        newMember.roles.remove(settings.role_boost_id).catch(() => {});
      }
    }
  },
};
