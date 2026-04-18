'use strict';

const { db } = require('../database');

module.exports = {
  name : 'guildMemberRemove',

  execute(member, client) {
    // Clôturer une éventuelle session vocale ouverte
    const guildId = member.guild.id;
    const userId  = member.id;
    const now     = Math.floor(Date.now() / 1000);

    const session = db.prepare('SELECT * FROM voice_sessions WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (session) {
      const duration = Math.max(0, now - session.joined_at);
      db.prepare(`
        INSERT INTO user_stats (guild_id, user_id, voice_seconds, last_voice_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
          voice_seconds = voice_seconds + excluded.voice_seconds,
          last_voice_at = excluded.last_voice_at
      `).run(guildId, userId, duration, now);

      db.prepare('DELETE FROM voice_sessions WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    }
  },
};
