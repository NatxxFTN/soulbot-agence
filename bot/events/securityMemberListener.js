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
const registry = require('../core/security-registry');
const { applySanctionMember } = require('../core/apply-sanction');

// SOC Phase 1 : exécution déléguée à apply-sanction (exécuteur unique,
// garde-fous owner/bot + log honnête). Les actions legacy (mute_5m…)
// sont normalisées vers l'échelle canonique par le registry.
async function applyMemberAction(member, feature, reason, action) {
  const { sanction, timeoutMinutes } = registry.normalizeSanction(action);
  await applySanctionMember(member, feature, sanction, reason, {
    durationMs: timeoutMinutes ? timeoutMinutes * 60_000 : null,
    detail    : `Join: ${reason}`,
  });
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

    // ── 0. Blacklist globale (avant tout le reste) ─────────────────────────
    try {
      const { db } = require('../database');
      const gbl = db.prepare('SELECT * FROM global_blacklist WHERE user_id = ?').get(member.id);
      if (gbl) {
        await member.ban({ reason: `Global blacklist (auto) : ${gbl.reason ?? 'sans raison'}` }).catch(() => {});
        storage.logAction(member.guild.id, member.id, 'globalblacklist', 'ban', `Join bloqué : ${gbl.reason ?? ''}`, null);
        return;
      }
    } catch (err) {
      console.error('[sec-member] globalblacklist:', err.message);
    }

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
