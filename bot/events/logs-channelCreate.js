'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

const TYPE_LABELS = {
  0: 'Texte', 2: 'Vocal', 4: 'Catégorie', 5: 'Annonce',
  10: 'Thread annonce', 11: 'Thread public', 12: 'Thread privé',
  13: 'Scène', 15: 'Forum', 16: 'Média',
};

module.exports = {
  name : 'channelCreate',

  async execute(channel) {
    if (!channel.guild) return;

    let executor = null;
    try {
      const audit = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target?.id === channel.id && Date.now() - entry.createdTimestamp < 10_000) {
        executor = entry.executor;
      }
    } catch { /* perms */ }

    L.log(channel.guild, 'channel_create', {
      channelId : channel.id,
      name      : channel.name,
      typeLabel : TYPE_LABELS[channel.type] ?? `Type ${channel.type}`,
      parentName: channel.parent?.name || null,
      topic     : channel.topic || null,
      executor,
      summary   : `Salon créé : #${channel.name}`,
      targetId  : channel.id,
      actorId   : executor?.id || null,
    });
  },
};
