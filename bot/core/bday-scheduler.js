'use strict';

const storage = require('./bday-storage');

/** Formate une date en YYYY-MM-DD (local). */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTemplate(template, user, guild) {
  return String(template || '')
    .replace(/\{user\}/g, `<@${user.id}>`)
    .replace(/\{username\}/g, user.username || user.tag || '')
    .replace(/\{server\}/g, guild?.name || '')
    .replace(/\{guild\}/g, guild?.name || '');
}

async function runBdayCheck(client) {
  try {
    const configs = storage.listEnabledConfigs();
    if (!configs.length) return;

    const date = todayStr();

    for (const cfg of configs) {
      const guild = client.guilds.cache.get(cfg.guild_id);
      if (!guild) continue;

      const channel = await guild.channels.fetch(cfg.announcement_channel).catch(() => null);
      if (!channel) continue;

      const rows = storage.listTodaysBirthdays(cfg.guild_id);
      for (const row of rows) {
        if (storage.isAlreadyAnnounced(cfg.guild_id, row.user_id, date)) continue;

        const user = await client.users.fetch(row.user_id).catch(() => null);
        if (!user) continue;

        const content = parseTemplate(cfg.message_template, user, guild);
        const pingPrefix = cfg.ping_everyone ? '@everyone ' : '';
        const payload = {
          content: `${pingPrefix}${content}`.trim(),
          allowedMentions: cfg.ping_everyone
            ? { parse: ['everyone', 'users'] }
            : { users: [user.id] },
        };

        const sent = await channel.send(payload).catch(err => {
          console.error('[bday-scheduler] send error:', err.message);
          return null;
        });
        if (sent) {
          storage.markAnnounced(cfg.guild_id, row.user_id, date);
        }
      }
    }
  } catch (err) {
    console.error('[bday-scheduler] runBdayCheck:', err);
  }
}

function startBdayScheduler(client) {
  console.log('[bday-scheduler] Démarré');
  // Premier run au démarrage (après 30s pour laisser le bot se stabiliser)
  setTimeout(() => runBdayCheck(client), 30 * 1000);
  // Puis toutes les heures
  setInterval(() => runBdayCheck(client), 60 * 60 * 1000);
}

module.exports = { startBdayScheduler, runBdayCheck };
