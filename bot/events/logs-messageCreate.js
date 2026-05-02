'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'messageCreate',

  async execute(message) {
    if (!message.guild) return;
    if (message.author?.bot) return;
    if (message.system) return;
    if (message.partial) return;

    L.log(message.guild, 'message_create', {
      author     : message.author,
      member     : message.member,
      channel    : message.channel,
      content    : message.content || '',
      messageId  : message.id,
      messageUrl : message.url,
      timestamp  : message.createdTimestamp,
      attachments: Array.from(message.attachments?.values?.() || []).map(a => ({
        name: a.name, url: a.url, size: a.size, contentType: a.contentType,
      })),
      embedsCount  : message.embeds?.length || 0,
      stickersCount: message.stickers?.size || 0,
      mentions: {
        users   : message.mentions?.users?.size || 0,
        roles   : message.mentions?.roles?.size || 0,
        channels: message.mentions?.channels?.size || 0,
        everyone: message.mentions?.everyone || false,
      },
      summary  : `${message.author.tag} → #${message.channel.name}`,
      actorId  : message.author.id,
      channelId: message.channel.id,
      isBot    : message.author.bot,
    });
  },
};
