'use strict';

// ── Garde emoji : le bot quitte un serveur → recalcule les serveurs
// accessibles (ses emojis ne sont plus utilisables).
const { setAccessibleGuilds } = require('../core/emoji-cache');

module.exports = {
  name: 'guildDelete',
  once: false,
  async execute(guild, client) {
    setAccessibleGuilds([...client.guilds.cache.keys()]);
    console.log(`[emoji-guard] -serveur ${guild?.name ?? guild?.id} — ${client.guilds.cache.size} serveur(s) accessibles`);
  },
};
