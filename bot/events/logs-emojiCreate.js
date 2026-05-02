'use strict';

const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'emojiCreate',

  async execute(emoji) {
    L.log(emoji.guild, 'emoji_update', {
      added  : [{ name: emoji.name, toString: () => emoji.toString() }],
      summary: `Emoji ajouté : ${emoji.name}`,
    });
  },
};
