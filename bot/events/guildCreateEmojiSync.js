'use strict';

// ── Garde emoji : le bot rejoint un serveur → recalcule les serveurs
// accessibles pour que ses emojis deviennent utilisables sans redémarrage.
const { setAccessibleGuilds } = require('../core/emoji-cache');

module.exports = {
  name: 'guildCreate',
  once: false,
  async execute(guild, client) {
    setAccessibleGuilds([...client.guilds.cache.keys()]);
    console.log(`[emoji-guard] +serveur ${guild?.name ?? guild?.id} — ${client.guilds.cache.size} serveur(s) accessibles`);
  },
};
