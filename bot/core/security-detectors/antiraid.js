'use strict';

// ── Détecteur antiraid — join flood (cache mémoire, fenêtre configurable) ────
// threshold = joins max dans la fenêtre
// custom_data.window_seconds = fenêtre en secondes (défaut 60s)

const guildJoins = new Map(); // guildId -> { joins: number[], raidActive: bool, raidUntil: number }
const RAID_COOLDOWN_MS = 5 * 60 * 1000; // "raid actif" dure 5 min après déclenchement

setInterval(() => {
  const now = Date.now();
  for (const [gid, data] of guildJoins) {
    if (!data.raidActive && (data.joins.length === 0 || now - data.joins[data.joins.length - 1] > 10 * 60 * 1000)) {
      guildJoins.delete(gid);
    }
  }
}, 5 * 60 * 1000).unref?.();

function parseWindow(config) {
  if (!config?.custom_data) return 60;
  try {
    const d = typeof config.custom_data === 'string' ? JSON.parse(config.custom_data) : config.custom_data;
    const s = Number(d?.window_seconds);
    return (Number.isFinite(s) && s >= 10 && s <= 300) ? s : 60;
  } catch { return 60; }
}

module.exports = {
  async check(_message, _config) {
    return { triggered: false };
  },

  async checkNewMember(member, config) {
    const threshold     = Number(config?.threshold) || 10;
    const windowSeconds = parseWindow(config);
    const now           = Date.now();
    const windowMs      = windowSeconds * 1000;
    const guildId       = member.guild.id;

    if (!guildJoins.has(guildId)) {
      guildJoins.set(guildId, { joins: [], raidActive: false, raidUntil: 0 });
    }
    const data = guildJoins.get(guildId);

    // Raid déjà en cours → chaque nouveau join est considéré comme part du raid
    if (data.raidActive && now < data.raidUntil) {
      return {
        triggered   : true,
        reason      : `Raid en cours — ${member.user.tag} rejoint pendant la période (window ${windowSeconds}s)`,
        raidContext : true,
      };
    }
    if (data.raidActive && now >= data.raidUntil) {
      data.raidActive = false;
      data.joins      = [];
    }

    // Nettoyer les joins hors fenêtre, ajouter celui-ci
    data.joins = data.joins.filter(t => now - t < windowMs);
    data.joins.push(now);

    if (data.joins.length >= threshold) {
      data.raidActive = true;
      data.raidUntil  = now + RAID_COOLDOWN_MS;
      return {
        triggered  : true,
        reason     : `Raid détecté : ${data.joins.length} joins en ${windowSeconds}s (seuil ${threshold})`,
        raidContext: true,
        raidStart  : true,
      };
    }
    return { triggered: false };
  },

  /**
   * Reset manuel — appelable depuis `;antiraid clear`.
   */
  clearRaid(guildId) {
    const data = guildJoins.get(guildId);
    if (!data) return;
    data.raidActive = false;
    data.raidUntil  = 0;
    data.joins      = [];
  },
};
