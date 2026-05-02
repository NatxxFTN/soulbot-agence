'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'messageDeleteBulk',

  async execute(messages, channel) {
    if (!channel?.guild) return;

    let executor = null;
    try {
      const audit = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && Date.now() - entry.createdTimestamp < 10_000) {
        executor = entry.executor;
      }
    } catch { /* perms */ }

    L.log(channel.guild, 'message_bulk_delete', {
      channel,
      count   : messages.size,
      executor,
      summary : `${messages.size} messages purgés dans #${channel.name}`,
      actorId : executor?.id || null,
      channelId: channel.id,
    });
  },
};
