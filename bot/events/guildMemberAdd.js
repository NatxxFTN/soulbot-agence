'use strict';

const { EmbedBuilder } = require('discord.js');
const { db, ensureGuild, getGuildSettings } = require('../database');
const { getRaidmodeConfig, trackJoin, logDetection } = require('../core/raidmode-helper');

module.exports = {
  name : 'guildMemberAdd',

  async execute(member, client) {
    const guildId = member.guild.id;
    ensureGuild(guildId);

    // ── Cache invitations (module invitations, futur) ─────────────────────────
    try {
      const newInvites    = await member.guild.invites.fetch();
      const cachedInvites = client.inviteCache.get(guildId) ?? new Map();

      let usedCode = null;
      for (const [code, invite] of newInvites) {
        const prev = cachedInvites.get(code) ?? 0;
        if (invite.uses > prev) { usedCode = code; break; }
      }

      client.inviteCache.set(guildId, new Map(newInvites.map(i => [i.code, i.uses])));
      if (usedCode) member._inviteCode = usedCode;
    } catch { /* pas de perm */ }

    // ── Rôles anciens au moment de l'arrivée (0 jours → aucun) ───────────────
    // Les rôles anciens sont assignés via le check périodique

    // ── Raidmode — détection automatique ────────────────────────────────────
    try {
      const raidCfg = getRaidmodeConfig(guildId);
      if (raidCfg?.active) {
        const threshold = raidCfg.join_threshold  ?? 5;
        const windowSec = raidCfg.join_window_sec ?? 10;
        const triggered = trackJoin(guildId, threshold, windowSec);
        if (triggered) {
          const action  = raidCfg.action || 'kick';
          const reason  = 'Raidmode — jointure suspecte détectée automatiquement';
          try {
            if (action === 'ban') {
              await member.ban({ reason, deleteMessageSeconds: 0 });
            } else if (action === 'timeout') {
              await member.timeout(10 * 60 * 1000, reason);
            } else {
              await member.kick(reason);
            }
            logDetection(guildId, member.id, member.user.tag, action);
          } catch { /* pas de perms */ }
        }
      }
    } catch { /* non bloquant */ }

    // ── Message de bienvenue ─────────────────────────────────────────────────
    const { getConfig, formatMessage } = require('../core/greeting-helper');
    const cfg = getConfig(guildId);
    if (cfg?.join_enabled && cfg.join_channel_id) {
      const ch = member.guild.channels.cache.get(cfg.join_channel_id);
      if (ch) await ch.send(formatMessage(cfg.join_message, member)).catch(() => {});
    }
  },
};
