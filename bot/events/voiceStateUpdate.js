'use strict';

const { db, ensureGuild, getGuildSettings } = require('../database');

module.exports = {
  name : 'voiceStateUpdate',

  async execute(oldState, newState, client) {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const guildId = newState.guild?.id ?? oldState.guild?.id;
    if (!guildId) return;

    ensureGuild(guildId);

    const userId     = member.id;
    const now        = Math.floor(Date.now() / 1000);
    const wasInVoice = oldState.channelId !== null;
    const isInVoice  = newState.channelId !== null;

    // ── Entrée en vocal ───────────────────────────────────────────────────────
    if (!wasInVoice && isInVoice) {
      db.prepare(`
        INSERT OR REPLACE INTO voice_sessions (guild_id, user_id, channel_id, joined_at)
        VALUES (?, ?, ?, ?)
      `).run(guildId, userId, newState.channelId, now);

      // Attribuer le rôle vocal si configuré
      const settings = getGuildSettings(guildId);
      if (settings?.role_voc_id) {
        const role = newState.guild.roles.cache.get(settings.role_voc_id);
        if (role) member.roles.add(role).catch(() => {});
      }
      return;
    }

    // ── Sortie du vocal ───────────────────────────────────────────────────────
    if (wasInVoice && !isInVoice) {
      _closeSession(guildId, userId, now);

      // Retirer le rôle vocal
      const settings = getGuildSettings(guildId);
      if (settings?.role_voc_id && member.roles.cache.has(settings.role_voc_id)) {
        member.roles.remove(settings.role_voc_id).catch(() => {});
      }
      return;
    }

    // ── Changement de salon vocal (ex: déplacer) ─────────────────────────────
    if (wasInVoice && isInVoice && oldState.channelId !== newState.channelId) {
      _closeSession(guildId, userId, now);
      // Ouvrir une nouvelle session
      db.prepare(`
        INSERT OR REPLACE INTO voice_sessions (guild_id, user_id, channel_id, joined_at)
        VALUES (?, ?, ?, ?)
      `).run(guildId, userId, newState.channelId, now);
    }
  },
};

// ─── Helper interne ───────────────────────────────────────────────────────────
function _closeSession(guildId, userId, now) {
  const session = db.prepare('SELECT * FROM voice_sessions WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!session) return;

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
