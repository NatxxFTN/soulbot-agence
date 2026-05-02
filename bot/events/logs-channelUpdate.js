'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'channelUpdate',

  async execute(oldChannel, newChannel) {
    if (!newChannel.guild) return;

    const diffs = [];
    if (oldChannel.name !== newChannel.name) diffs.push(`**Nom** : \`#${oldChannel.name}\` → \`#${newChannel.name}\``);
    if (oldChannel.topic !== newChannel.topic) diffs.push(`**Sujet** : \`${oldChannel.topic || '_(vide)_'}\` → \`${newChannel.topic || '_(vide)_'}\``);
    if (oldChannel.nsfw !== newChannel.nsfw) diffs.push(`**NSFW** : ${oldChannel.nsfw ? 'Oui' : 'Non'} → ${newChannel.nsfw ? 'Oui' : 'Non'}`);
    if (oldChannel.parentId !== newChannel.parentId) {
      diffs.push(`**Catégorie** : \`${oldChannel.parent?.name || '_(aucune)_'}\` → \`${newChannel.parent?.name || '_(aucune)_'}\``);
    }
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      diffs.push(`**Slowmode** : ${oldChannel.rateLimitPerUser || 0}s → ${newChannel.rateLimitPerUser || 0}s`);
    }
    if (oldChannel.bitrate !== newChannel.bitrate) {
      diffs.push(`**Bitrate** : ${(oldChannel.bitrate || 0)/1000}kbps → ${(newChannel.bitrate || 0)/1000}kbps`);
    }
    if (oldChannel.userLimit !== newChannel.userLimit) {
      diffs.push(`**Limite users** : ${oldChannel.userLimit || '∞'} → ${newChannel.userLimit || '∞'}`);
    }

    if (!diffs.length) return;

    let executor = null;
    try {
      const audit = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target?.id === newChannel.id && Date.now() - entry.createdTimestamp < 10_000) {
        executor = entry.executor;
      }
    } catch { /* perms */ }

    L.log(newChannel.guild, 'channel_update', {
      channelId: newChannel.id,
      name     : newChannel.name,
      diffs,
      executor,
      summary  : `Salon modifié : #${newChannel.name}`,
      targetId : newChannel.id,
      actorId  : executor?.id || null,
    });
  },
};
