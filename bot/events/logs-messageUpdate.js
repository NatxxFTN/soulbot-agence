'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'messageUpdate',

  async execute(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    if (oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;

    L.log(newMessage.guild, 'message_edit', {
      author    : newMessage.author,
      member    : newMessage.member,
      channel   : newMessage.channel,
      oldContent: oldMessage.content || '',
      newContent: newMessage.content || '',
      messageId : newMessage.id,
      messageUrl: newMessage.url,
      summary   : `${newMessage.author.tag} — édité dans #${newMessage.channel?.name ?? '?'}`,
      actorId   : newMessage.author.id,
      channelId : newMessage.channel?.id || null,
    });
  },
};
