'use strict';

const { EmbedBuilder } = require('discord.js');
const { db, ensureGuild, getGuildSettings } = require('../database');

module.exports = {
  name : 'messageReactionRemove',

  async execute(reaction, user, client) {
    if (user.bot) return;

    try {
      if (reaction.partial)         await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch { return; }

    const message = reaction.message;
    if (!message.guild) return;

    const guildId  = message.guild.id;
    const settings = getGuildSettings(guildId);
    if (!settings?.star_enabled || !settings?.star_channel_id) return;
    if (reaction.emoji.name !== settings.star_emoji) return;

    // Retirer la réaction de la base
    db.prepare('DELETE FROM star_reactions WHERE guild_id = ? AND message_id = ? AND user_id = ?').run(guildId, message.id, user.id);

    const starCount = db.prepare('SELECT COUNT(*) as c FROM star_reactions WHERE guild_id = ? AND message_id = ?').get(guildId, message.id).c;

    const entry     = db.prepare('SELECT * FROM starboard_entries WHERE guild_id = ? AND original_message_id = ?').get(guildId, message.id);
    if (!entry?.starboard_message_id) return;

    const sbChannel = message.guild.channels.cache.get(settings.star_channel_id);
    if (!sbChannel) return;

    if (starCount < settings.star_threshold) {
      // Retirer du starboard
      try {
        const sbMsg = await sbChannel.messages.fetch(entry.starboard_message_id);
        await sbMsg.delete();
      } catch {}
      db.prepare('UPDATE starboard_entries SET starboard_message_id = NULL, star_count = ? WHERE guild_id = ? AND original_message_id = ?').run(starCount, guildId, message.id);
    } else {
      // Mettre à jour le compteur
      try {
        const sbMsg = await sbChannel.messages.fetch(entry.starboard_message_id);
        const newContent = `${settings.star_emoji} **${starCount}** <#${message.channel.id}>`;
        await sbMsg.edit({ content: newContent });
        db.prepare('UPDATE starboard_entries SET star_count = ? WHERE guild_id = ? AND original_message_id = ?').run(starCount, guildId, message.id);
      } catch {}
    }
  },
};
