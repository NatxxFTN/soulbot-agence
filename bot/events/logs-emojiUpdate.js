'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'emojiUpdate',

  async execute(oldEmoji, newEmoji) {
    if (oldEmoji.name === newEmoji.name) return;

    L.log(newEmoji.guild, 'emoji_update', {
      renamed: [{ from: oldEmoji.name, to: newEmoji.name }],
      summary: `Emoji renommé : ${oldEmoji.name} → ${newEmoji.name}`,
    });
  },
};
