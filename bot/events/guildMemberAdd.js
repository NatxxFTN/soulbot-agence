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

    // ── Greeting (système ancien) ────────────────────────────────────────────
    const { getConfig, formatMessage } = require('../core/greeting-helper');
    const greetCfg = getConfig(guildId);
    if (greetCfg?.join_enabled && greetCfg.join_channel_id) {
      const ch = member.guild.channels.cache.get(greetCfg.join_channel_id);
      if (ch) await ch.send(formatMessage(greetCfg.join_message, member)).catch(() => {});
    }

    // ── Welcomer v2 ──────────────────────────────────────────────────────────
    try {
      const {
        getWelcomeConfig, shouldTriggerWelcome, buildWelcomeMessage,
        replaceVariables, getAutoRoles, logWelcome,
      } = require('../core/welcome-helper');

      const wCfg = getWelcomeConfig(guildId);
      const { trigger } = shouldTriggerWelcome(wCfg, member);
      if (!trigger) return;

      const channel = member.guild.channels.cache.get(wCfg.channel_id);
      if (!channel) return;

      const payload = buildWelcomeMessage(wCfg, member);

      // Mention then delete : mention séparée puis supprimée après 3s
      if (wCfg.mention_then_delete) {
        const mentionMsg = await channel.send({ content: `<@${member.id}>` }).catch(() => null);
        if (mentionMsg) setTimeout(() => mentionMsg.delete().catch(() => {}), 3000);
      } else if (wCfg.mention_user) {
        payload.content = (`<@${member.id}> ` + (payload.content || '')).trim();
      }

      const sent = await channel.send(payload);

      if (wCfg.auto_delete_seconds > 0) {
        setTimeout(() => sent.delete().catch(() => {}), wCfg.auto_delete_seconds * 1000);
      }

      // Salon secondaire
      if (wCfg.secondary_channel_id) {
        const ch2 = member.guild.channels.cache.get(wCfg.secondary_channel_id);
        if (ch2) await ch2.send(payload).catch(() => {});
      }

      // Rôles auto multiples
      const autoRoles = getAutoRoles(guildId);
      for (const r of autoRoles) {
        await member.roles.add(r.role_id).catch(e => console.error('[welcomer] rôle auto:', e.message));
      }

      // DM avec délai optionnel
      let dmSent = false;
      if (wCfg.dm_enabled && wCfg.dm_content) {
        const dmText = replaceVariables(wCfg.dm_content, member);
        const sendDm = () => member.send({ content: dmText }).then(() => { dmSent = true; }).catch(() => {});
        if (wCfg.dm_delay_seconds > 0) {
          setTimeout(sendDm, wCfg.dm_delay_seconds * 1000);
        } else {
          await sendDm();
        }
      }

      // Log stats
      const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
      logWelcome(guildId, member.id, member.user.tag, ageDays, dmSent);
    } catch (err) {
      console.error('[welcomer]', err);
    }
  },
};
