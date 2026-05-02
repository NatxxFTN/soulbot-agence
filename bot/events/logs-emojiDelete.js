'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'emojiDelete',

  async execute(emoji) {
    L.log(emoji.guild, 'emoji_update', {
      removed: [{ name: emoji.name }],
      summary: `Emoji retiré : ${emoji.name}`,
    });
  },
};
