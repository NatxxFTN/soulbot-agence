'use strict';

const storage = require('./twitch-storage');
const api = require('./twitch-api');

let warnedOnce = false;

async function tick(client) {
  try {
    const streamers = storage.listAllStreamers();
    if (streamers.length === 0) return;

    const userIds = streamers.map(s => s.twitch_user_id).filter(Boolean);
    if (userIds.length === 0) return;

    const byId = new Map();
    for (const s of streamers) {
      if (s.twitch_user_id) byId.set(s.twitch_user_id, s);
    }

    // Batches de 100
    for (let i = 0; i < userIds.length; i += 100) {
      const batch = userIds.slice(i, i + 100);
      let streams = [];
      try {
        streams = await api.getStreamsByUserIds(batch);
      } catch (err) {
        console.error('[twitch-scheduler] fetch:', err.message);
        continue;
      }

      for (const stream of streams) {
        const entry = byId.get(stream.user_id);
        if (!entry) continue;
        if (entry.last_live_id === stream.id) continue;

        const cfg = storage.getConfig(entry.guild_id);
        if (!cfg || !cfg.enabled || !cfg.channel_id) {
          storage.updateLive(entry.id, Date.now(), stream.id);
          continue;
        }

        const guild = client.guilds.cache.get(entry.guild_id);
        if (!guild) continue;

        try {
          const ch = await guild.channels.fetch(cfg.channel_id).catch(() => null);
          if (!ch) {
            storage.updateLive(entry.id, Date.now(), stream.id);
            continue;
          }
          const tpl = cfg.message_template || '🔴 **{streamer}** est en LIVE !\n{title}\n{url}';
          const content = tpl
            .replace(/\{streamer\}/g, stream.user_name || entry.display_name || entry.twitch_username)
            .replace(/\{title\}/g, stream.title || '')
            .replace(/\{url\}/g, `https://twitch.tv/${entry.twitch_username}`)
            .replace(/\{game\}/g, stream.game_name || '');
          const prefix = cfg.ping_role_id ? `<@&${cfg.ping_role_id}> ` : '';
          await ch.send({
            content: prefix + content,
            allowedMentions: cfg.ping_role_id ? { roles: [cfg.ping_role_id] } : undefined,
          }).catch(() => {});

          storage.updateLive(entry.id, Date.now(), stream.id);
        } catch (err) {
          console.error('[twitch-scheduler] post:', err.message);
        }
      }
    }
  } catch (err) {
    console.error('[twitch-scheduler] tick:', err);
  }
}

function startTwitchScheduler(client) {
  if (!api.hasCredentials()) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.log('[twitch-scheduler] TWITCH_CLIENT_ID manquant — désactivé');
    }
    return;
  }
  console.log('[twitch-scheduler] Démarré');
  setInterval(() => tick(client), 5 * 60 * 1000);
  // Premier check après 2 minutes
  setTimeout(() => tick(client), 2 * 60 * 1000);
}

module.exports = { startTwitchScheduler };
