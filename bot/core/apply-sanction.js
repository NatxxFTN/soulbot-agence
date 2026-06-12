'use strict';

// ═══════════════════════════════════════════════
// APPLY SANCTION — SOC Phase 1 (exécuteur unique des sanctions auto)
// Échelle canonique : 'none'|'delete'|'warn'|'timeout'|'kick'|'ban'
// (+ durationMs pour timeout — fourni par le ladder).
// Garde-fous SYSTÉMATIQUES (indépendants du vault — décision Nathan) :
//   · jamais l'owner du serveur · jamais le bot lui-même
//   · hiérarchie + perms bot via moderatable/kickable/bannable
// Log honnête (fix v2.1.2 conservé) : une punition bloquée est loguée
// 'delete' (la vérité), jamais comme un succès.
// Log systématique dans security_logs → visible via ;securitylogs.
// ═══════════════════════════════════════════════

const storage = require('./security-storage');
const { sendPunishmentNotice } = require('./security-punishments');

const TIMEOUT_MS = 10 * 60 * 1000; // défaut si aucune durée fournie

/**
 * Garde-fous absolus — null si sanctionnable, sinon la raison du refus.
 * @param {import('discord.js').GuildMember} member
 */
function sanctionBlockReason(member) {
  if (!member) return null; // rien à bloquer (ex: membre déjà parti)
  if (member.id === member.guild?.ownerId) return 'owner du serveur';
  if (member.client?.user && member.id === member.client.user.id) return 'le bot lui-même';
  return null;
}

/**
 * Exécute une punition sur un membre. Retourne true si réellement appliquée.
 * @param {string} sanction - 'warn'|'timeout'|'kick'|'ban'
 */
async function _punishMember(member, sanction, fullReason, durationMs, guildId, clientUserId) {
  switch (sanction) {
    case 'warn': {
      try {
        const warnHelper = require('./warn-helper');
        if (typeof warnHelper.addWarn === 'function') {
          warnHelper.addWarn(guildId, member.id, clientUserId, fullReason);
        }
      } catch { /* module warn absent — log sécurité suffit */ }
      return true; // un warn n'est pas contraint par la hiérarchie
    }
    case 'timeout':
      if (member?.moderatable) { await member.timeout(durationMs ?? TIMEOUT_MS, fullReason); return true; }
      return false;
    case 'kick':
      if (member?.kickable) { await member.kick(fullReason); return true; }
      return false;
    case 'ban':
      if (member?.bannable) { await member.ban({ reason: fullReason, deleteMessageSeconds: 3600 }); return true; }
      return false;
    default:
      return false;
  }
}

/**
 * Applique une sanction sur l'auteur d'un MESSAGE et logue l'action.
 * @param {import('discord.js').Message} message
 * @param {string} feature - module déclencheur ('antispam', 'antilink', …)
 * @param {string} sanction - échelle canonique
 * @param {string} reason
 * @param {?string} logsChannelId - canal de logs dédié du module (optionnel)
 * @param {{durationMs?: number, offenseCount?: number}} [opts]
 */
async function applySanction(message, feature, sanction, reason, logsChannelId = null, opts = {}) {
  const member = message.member;
  const countTag = opts.offenseCount ? ` [récidive ${opts.offenseCount}]` : '';
  const fullReason = `[${feature}] ${reason}${countTag} (auto)`;

  // 1. Suppression du message (toutes sanctions sauf 'none')
  if (sanction !== 'none') {
    await message.delete().catch(() => {});
  }

  // 2. Garde-fous absolus AVANT toute punition
  const punitive = sanction !== 'none' && sanction !== 'delete';
  const blocked = punitive ? sanctionBlockReason(member) : null;

  // 3. Punition — on suit si elle a RÉELLEMENT été appliquée
  let applied = false;
  if (punitive && !blocked) {
    try {
      applied = await _punishMember(
        member, sanction, fullReason, opts.durationMs,
        message.guild.id, message.client.user.id,
      );
    } catch (err) {
      applied = false;
      console.error(`[apply-sanction] ${feature} ${sanction}:`, err.message);
    }
  }

  // Sanction réellement effective (log honnête)
  const effectiveSanction = (punitive && !applied) ? 'delete' : sanction;
  if (punitive && !applied) {
    const why = blocked ?? 'hiérarchie/permissions';
    console.warn(`[apply-sanction] ${feature}: sanction '${sanction}' refusée sur ${message.author.tag} (${why}) — loguée en 'delete'.`);
  }

  // 4. Log DB — table unifiée security_logs
  storage.logAction(
    message.guild.id,
    message.author.id,
    feature,
    effectiveSanction,
    message.content?.slice(0, 500) || '',
    message.channel.id,
  );
  storage.incrementStat(message.guild.id, feature);

  // 5. Notice salon (auto-delete) — uniquement si la punition a porté
  if (member && applied && punitive) {
    await sendPunishmentNotice(message.channel, member, feature, sanction, reason).catch(() => {});
  }

  // 6. Log channel dédié du module (séparé de la réponse — règle 6)
  if (logsChannelId) {
    try {
      const ch = message.guild.channels.cache.get(logsChannelId);
      if (ch) {
        const note = (punitive && !applied) ? ` (sanction '${sanction}' impossible : ${blocked ?? 'perms'})` : '';
        await ch.send({
          content: `[${feature.toUpperCase()}] ${message.author.tag} (${message.author.id}) | ${effectiveSanction}${note} | ${reason} | <t:${Math.floor(Date.now() / 1000)}:f>`,
          allowedMentions: { parse: [] },
        }).catch(() => {});
      }
    } catch { /* canal supprimé */ }
  }

  return { applied, effectiveSanction, blocked };
}

/**
 * Applique une sanction sur un MEMBRE hors contexte message (join, antinuke).
 * Mêmes garde-fous, même log honnête, même table de logs.
 * @param {import('discord.js').GuildMember} member
 * @param {{durationMs?: number, logsChannelId?: string, detail?: string}} [opts]
 */
async function applySanctionMember(member, feature, sanction, reason, opts = {}) {
  const fullReason = `[${feature}] ${reason} (auto)`;
  const punitive = sanction !== 'none' && sanction !== 'delete';
  const blocked = punitive ? sanctionBlockReason(member) : null;

  let applied = false;
  if (punitive && !blocked) {
    try {
      applied = await _punishMember(
        member, sanction, fullReason, opts.durationMs,
        member.guild.id, member.client.user.id,
      );
    } catch (err) {
      applied = false;
      console.error(`[apply-sanction:member] ${feature} ${sanction}:`, err.message);
    }
  }

  const effectiveSanction = (punitive && !applied) ? 'none' : sanction;
  if (punitive && !applied) {
    const why = blocked ?? 'hiérarchie/permissions';
    console.warn(`[apply-sanction:member] ${feature}: sanction '${sanction}' refusée sur ${member.user?.tag ?? member.id} (${why}).`);
  }

  storage.logAction(member.guild.id, member.id, feature, effectiveSanction, opts.detail ?? reason, null);
  storage.incrementStat(member.guild.id, feature);

  if (opts.logsChannelId) {
    try {
      const ch = member.guild.channels.cache.get(opts.logsChannelId);
      if (ch) {
        await ch.send({
          content: `[${feature.toUpperCase()}] ${member.user?.tag ?? member.id} (${member.id}) | ${effectiveSanction} | ${reason} | <t:${Math.floor(Date.now() / 1000)}:f>`,
          allowedMentions: { parse: [] },
        }).catch(() => {});
      }
    } catch { /* canal supprimé */ }
  }

  return { applied, effectiveSanction, blocked };
}

module.exports = { applySanction, applySanctionMember, sanctionBlockReason, TIMEOUT_MS };
