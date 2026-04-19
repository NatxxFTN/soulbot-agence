'use strict';

const { EmbedBuilder } = require('discord.js');
const { db, ensureGuild, getGuildSettings } = require('../database');

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

    // ── Message de bienvenue ─────────────────────────────────────────────────
    const { getConfig, formatMessage } = require('../core/greeting-helper');
    const cfg = getConfig(guildId);
    if (cfg?.join_enabled && cfg.join_channel_id) {
      const ch = member.guild.channels.cache.get(cfg.join_channel_id);
      if (ch) await ch.send(formatMessage(cfg.join_message, member)).catch(() => {});
    }
  },
};
