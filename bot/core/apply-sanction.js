'use strict';

// ═══════════════════════════════════════════════
// APPLY SANCTION — v2.1.2 (fix audit sécurité)
// Applique les sanctions des systèmes antispam/antileak
// (échelle 'none'|'delete'|'warn'|'timeout'|'kick'|'ban' — différente
// de l'échelle Forteresse 'delete'|'warn'|'mute_5m'|...).
// Log systématique dans security_logs → visible via ;securitylogs.
// ═══════════════════════════════════════════════

const storage = require('./security-storage');
const { sendPunishmentNotice } = require('./security-punishments');

const TIMEOUT_MS = 10 * 60 * 1000; // sanction 'timeout' = 10 min

/**
 * Applique une sanction et logue l'action.
 * @param {import('discord.js').Message} message
 * @param {string} feature - 'antispam' | 'antileak'
 * @param {string} sanction - 'none'|'delete'|'warn'|'timeout'|'kick'|'ban'
 * @param {string} reason
 * @param {?string} logsChannelId - canal de logs dédié du module (optionnel)
 */
async function applySanction(message, feature, sanction, reason, logsChannelId = null) {
  const member = message.member;
  const fullReason = `[${feature}] ${reason} (auto)`;

  // 1. Suppression du message (toutes sanctions sauf 'none')
  if (sanction !== 'none') {
    await message.delete().catch(() => {});
  }

  // 2. Sanction sur le membre
  try {
    switch (sanction) {
      case 'warn': {
        try {
          const warnHelper = require('./warn-helper');
          if (typeof warnHelper.addWarn === 'function') {
            warnHelper.addWarn(message.guild.id, member.id, message.client.user.id, fullReason);
          }
        } catch { /* module warn absent — log sécurité suffit */ }
        break;
      }
      case 'timeout':
        if (member?.moderatable) await member.timeout(TIMEOUT_MS, fullReason).catch(() => {});
        break;
      case 'kick':
        if (member?.kickable) await member.kick(fullReason).catch(() => {});
        break;
      case 'ban':
        if (member?.bannable) await member.ban({ reason: fullReason, deleteMessageSeconds: 3600 }).catch(() => {});
        break;
      // 'none' et 'delete' : rien de plus
    }
  } catch (err) {
    console.error(`[apply-sanction] ${feature} ${sanction}:`, err.message);
  }

  // 3. Log DB — même table que la Forteresse pour un ;securitylogs unifié
  storage.logAction(
    message.guild.id,
    message.author.id,
    feature,
    sanction,
    message.content?.slice(0, 500) || '',
    message.channel.id,
  );
  storage.incrementStat(message.guild.id, feature);

  // 4. Notice dans le salon (auto-delete) si sanction visible
  if (member && sanction !== 'none' && sanction !== 'delete') {
    await sendPunishmentNotice(message.channel, member, feature, sanction, reason).catch(() => {});
  }

  // 5. Log channel dédié du module (séparé de la réponse — règle 6)
  if (logsChannelId) {
    try {
      const ch = message.guild.channels.cache.get(logsChannelId);
      if (ch) {
        await ch.send({
          content: `[${feature.toUpperCase()}] ${message.author.tag} (${message.author.id}) | ${sanction} | ${reason} | <t:${Math.floor(Date.now() / 1000)}:f>`,
          allowedMentions: { parse: [] },
        }).catch(() => {});
      }
    } catch { /* canal supprimé */ }
  }
}

module.exports = { applySanction, TIMEOUT_MS };
