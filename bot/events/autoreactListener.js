'use strict';

const storage = require('../core/autoreact-storage');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, _client) {
    try {
      if (!message.guild) return;
      if (!message.channel) return;

      const config = storage.getAutoreact(message.channel.id);
      if (!config) return;
      if (config.ignore_bots && message.author?.bot) return;

      const emojis = Array.isArray(config.emojis) ? config.emojis.slice(0, 5) : [];
      for (const emoji of emojis) {
        if (!emoji) continue;
        await message.react(emoji).catch(() => {});
      }
    } catch (err) {
      // Ne jamais crasher un event sur une réaction défaillante
      console.error('[autoreact-listener]', err);
    }
  },
};
