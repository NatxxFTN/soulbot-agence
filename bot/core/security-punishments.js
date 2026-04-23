'use strict';

// ── Security Punishments — applique les actions (delete/warn/mute/kick/ban) ───
// Appelé par les détecteurs via security-listener.

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('./emojis');
const storage = require('./security-storage');

const ACTION_LABELS = {
  delete : 'Message supprimé',
  warn   : 'Avertissement',
  mute_5m: 'Muet 5 minutes',
  mute_1h: 'Muet 1 heure',
  kick   : 'Expulsé',
  ban    : 'Banni',
};

const FEATURE_LABELS = {
  antilink      : 'Anti-Link',
  antiinvite    : 'Anti-Invite',
  antieveryone  : 'Anti-@everyone',
  antimention   : 'Anti-Mention spam',
  antibot       : 'Anti-Bot',
  antiduplicate : 'Anti-Duplicate',
  antiwords     : 'Filtre de mots',
  anticaps      : 'Anti-Caps',
  antiemojispam : 'Anti-Emoji spam',
  antinsfw      : 'Anti-NSFW',
  antinewaccount: 'Anti-Nouveau compte',
  antiraid      : 'Anti-Raid',
};

/**
 * Applique une punition automatique après détection d'une feature sécurité.
 * @param {string} action  - 'delete' | 'warn' | 'mute_5m' | 'mute_1h' | 'kick' | 'ban'
 * @param {import('discord.js').Message} message
 * @param {string} feature - nom de la feature qui a déclenché
 * @param {string} reason  - raison lisible
 * @returns {Promise<{deleted:boolean, punished:boolean, error:string|null}>}
 */
async function applyPunishment(action, message, feature, reason) {
  const results = { deleted: false, punished: false, error: null };

  try {
    // ── 1. Supprimer le message (sauf si action explicitement différente) ──
    try {
      await message.delete();
      results.deleted = true;
    } catch { /* déjà supprimé ou pas la perm */ }

    const member = message.member;
    if (!member) {
      storage.logAction(message.guild.id, message.author?.id || '0', feature, action, message.content?.slice(0, 500) || '', message.channel.id);
      storage.incrementStat(message.guild.id, feature);
      return results;
    }

    const fullReason = `[${feature}] ${reason} (auto)`;

    // ── 2. Exécuter la punition ─────────────────────────────────────────────
    switch (action) {
      case 'delete':
        break;

      case 'warn':
        // Tentative d'intégration avec le système de warn existant
        try {
          const warnHelper = require('./warn-helper');
          if (typeof warnHelper.addWarn === 'function') {
            warnHelper.addWarn(message.guild.id, member.id, message.client.user.id, fullReason);
          }
        } catch { /* pas de module warn — on se contente du log sécurité */ }
        results.punished = true;
        break;

      case 'mute_5m':
        if (member.moderatable) {
          await member.timeout(5 * 60 * 1000, fullReason).catch(() => {});
          results.punished = true;
        }
        break;

      case 'mute_1h':
        if (member.moderatable) {
          await member.timeout(60 * 60 * 1000, fullReason).catch(() => {});
          results.punished = true;
        }
        break;

      case 'kick':
        if (member.kickable) {
          await member.kick(fullReason).catch(() => {});
          results.punished = true;
        }
        break;

      case 'ban':
        if (member.bannable) {
          await member.ban({ reason: fullReason, deleteMessageSeconds: 3600 }).catch(() => {});
          results.punished = true;
        }
        break;
    }

    // ── 3. Logger en DB ─────────────────────────────────────────────────────
    storage.logAction(
      message.guild.id,
      member.id,
      feature,
      action,
      message.content?.slice(0, 500) || '',
      message.channel.id,
    );
    storage.incrementStat(message.guild.id, feature);

    // ── 4. Notifier le salon (auto-delete 10s) ──────────────────────────────
    if (action !== 'delete') {
      await sendPunishmentNotice(message.channel, member, feature, action, reason);
    }
  } catch (err) {
    console.error(`[security-punishment] ${feature} ${action}:`, err.message);
    results.error = err.message;
  }

  return results;
}

async function sendPunishmentNotice(channel, member, feature, action, reason) {
  const actionLabel  = ACTION_LABELS[action]  || action;
  const featureLabel = FEATURE_LABELS[feature] || feature;

  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('btn_error')} **${actionLabel}** · ${featureLabel}`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('ui_user')} <@${member.id}> · **Raison** : ${reason}`,
    ),
  );

  const notice = await channel.send({
    components: [container],
    flags     : MessageFlags.IsComponentsV2,
    allowedMentions: { users: [member.id] },
  }).catch(() => null);

  if (notice) {
    setTimeout(() => notice.delete().catch(() => {}), 10_000);
  }
}

module.exports = {
  applyPunishment,
  sendPunishmentNotice,
  ACTION_LABELS,
  FEATURE_LABELS,
};
