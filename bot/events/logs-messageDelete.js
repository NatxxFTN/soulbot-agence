'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'messageDelete',

  async execute(message) {
    if (!message.guild) return;
    if (message.partial) return;
    if (message.author?.bot) return;

    L.log(message.guild, 'message_delete', {
      author          : message.author || null,
      member          : message.member || null,
      channel         : message.channel || { id: message.channelId, name: '?' },
      content         : message.content || '',
      messageId       : message.id,
      createdTimestamp: message.createdTimestamp,
      attachments     : Array.from(message.attachments?.values?.() || []).map(a => ({
        name: a.name, size: a.size, url: a.url, contentType: a.contentType,
      })),
      summary: `${message.author?.tag ?? 'Inconnu'} — #${message.channel?.name ?? '?'} — ${(message.content || '').slice(0, 60)}`,
      actorId: message.author?.id || null,
      channelId: message.channel?.id || null,
    });
  },
};
