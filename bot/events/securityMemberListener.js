'use strict';

// ── Security Member Listener — dispatch guildMemberAdd ───────────────────────
// Câble antibot · antiraid · antinewaccount dans cet ordre de priorité.
// Coexiste avec bot/events/guildMemberAdd.js (welcomer/greeting) — les 2
// listeners sont enregistrés indépendamment par l'event loader.

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const { e } = require('../core/emojis');
const storage = require('../core/security-storage');

async function applyMemberAction(member, feature, reason, action) {
  const fullReason = `[${feature}] ${reason}`;
  try {
    switch (action) {
      case 'kick':
        if (member.kickable) await member.kick(fullReason);
        break;
      case 'ban':
        if (member.bannable) await member.ban({ reason: fullReason, deleteMessageSeconds: 0 });
        break;
      case 'mute_5m':
        if (member.moderatable) await member.timeout(5 * 60 * 1000, fullReason);
        break;
      case 'mute_1h':
        if (member.moderatable) await member.timeout(60 * 60 * 1000, fullReason);
        break;
      case 'warn':
        /* join-time warn = log seulement */
        break;
    }
  } catch (err) {
    console.error(`[sec-member] ${feature} ${action}:`, err.message);
  }

  storage.logAction(member.guild.id, member.id, feature, action, `Join: ${reason}`, null);
  storage.incrementStat(member.guild.id, feature);
}

async function notifyAdminsRaid(guild, reason) {
  try {
    const channel = guild.systemChannel;
    if (!channel) return;
    const me = await guild.members.fetchMe();
    if (!channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages)) return;

    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_error')} **⚠️ RAID DÉTECTÉ**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_protection')} ${reason}\n` +
      `${e('btn_tip')} Les nouveaux membres sont auto-expulsés pendant 5 min.\n` +
      `${e('ui_user')} Utilise \`;lockdown\` pour verrouiller le serveur manuellement.\n` +
      `${e('btn_success')} \`;antiraid clear\` pour reset le raid si faux positif.`,
    ));

    await channel.send({
      components: [ct],
      flags     : MessageFlags.IsComponentsV2,
    }).catch(() => {});
  } catch (err) {
    console.error('[sec-member] notifyRaid:', err.message);
  }
}

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, _client) {
    if (!member.guild) return;

    // ── 1. antibot (priorité absolue) ──────────────────────────────────────
    const antibotCfg = storage.getConfig(member.guild.id, 'antibot');
    if (antibotCfg?.enabled && member.user.bot) {
      const detector = require('../core/security-detectors/antibot');
      const result   = await detector.checkNewMember(member, antibotCfg);
      if (result.triggered) {
        const action = (antibotCfg.action === 'warn' || antibotCfg.action === 'delete')
          ? 'kick'
          : (antibotCfg.action || 'kick');
        await applyMemberAction(member, 'antibot', result.reason, action);
        return;
      }
    }

    // ── 2. antiraid (priorité haute, même pour utilisateurs normaux) ──────
    const antiraidCfg = storage.getConfig(member.guild.id, 'antiraid');
    if (antiraidCfg?.enabled) {
      const detector = require('../core/security-detectors/antiraid');
      const result   = await detector.checkNewMember(member, antiraidCfg);
      if (result.triggered) {
        const action = (antiraidCfg.action === 'warn' || antiraidCfg.action === 'delete')
          ? 'kick'
          : (antiraidCfg.action || 'kick');
        await applyMemberAction(member, 'antiraid', result.reason, action);
        if (result.raidStart) {
          await notifyAdminsRaid(member.guild, result.reason);
        }
        return;
      }
    }

    // ── 3. antinewaccount (utilisateurs uniquement, pas les bots) ─────────
    const antinewCfg = storage.getConfig(member.guild.id, 'antinewaccount');
    if (antinewCfg?.enabled && !member.user.bot) {
      const detector = require('../core/security-detectors/antinewaccount');
      const result   = await detector.checkNewMember(member, antinewCfg);
      if (result.triggered) {
        const action = (antinewCfg.action === 'warn' || antinewCfg.action === 'delete')
          ? 'kick'
          : (antinewCfg.action || 'kick');
        await applyMemberAction(member, 'antinewaccount', result.reason, action);
        return;
      }
    }
  },
};
