'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// 3-PACKS SCHEDULERS — gère :
//   • Lockdown auto-unlock (tick 30s)
//   • Polls auto-close 24h (tick 60s)
//   • Giveaways v2 tirage (tick 30s) — si gwv2 utilisé
// ═══════════════════════════════════════════════════════════════════════════

const { db } = require('../database');

const STMT_LOCK_EXPIRED = db.prepare('SELECT * FROM lockdown_timed WHERE expires_at <= ?');
const STMT_LOCK_DEL = db.prepare('DELETE FROM lockdown_timed WHERE guild_id = ? AND channel_id = ?');

function startLockdownScheduler(client) {
  setInterval(async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = STMT_LOCK_EXPIRED.all(now);
    for (const row of expired) {
      try {
        const guild = client.guilds.cache.get(row.guild_id);
        if (!guild) { STMT_LOCK_DEL.run(row.guild_id, row.channel_id); continue; }
        const channel = guild.channels.cache.get(row.channel_id);
        if (channel) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason: '[lockdown auto-unlock]' });
          channel.send({ content: '🔓 Salon auto-déverrouillé.' }).catch(() => {});
        }
        STMT_LOCK_DEL.run(row.guild_id, row.channel_id);
      } catch (err) {
        console.warn(`[3packs-scheduler] auto-unlock fail ${row.channel_id}:`, err.message);
      }
    }
  }, 30_000);
  console.log('[3packs] lockdown-scheduler démarré (tick 30s)');
}

const STMT_POLLS_OPEN = db.prepare('SELECT * FROM polls WHERE active = 1 AND ends_at IS NOT NULL AND ends_at <= ?');
const STMT_POLL_CLOSE = db.prepare('UPDATE polls SET active = 0 WHERE id = ?');

function startPollScheduler(client) {
  setInterval(async () => {
    const now = Math.floor(Date.now() / 1000);
    const toClose = STMT_POLLS_OPEN.all(now);
    for (const poll of toClose) {
      try {
        const guild = client.guilds.cache.get(poll.guild_id);
        const channel = guild?.channels.cache.get(poll.channel_id);
        if (channel && poll.message_id) {
          const msg = await channel.messages.fetch(poll.message_id).catch(() => null);
          if (msg) {
            const votes = db.prepare('SELECT option_index, COUNT(*) AS n FROM poll_votes WHERE poll_id = ? GROUP BY option_index').all(poll.id);
            const total = votes.reduce((s, v) => s + v.n, 0);
            const opts = JSON.parse(poll.options);
            const lines = opts.map((o, i) => {
              const v = votes.find(x => x.option_index === i)?.n || 0;
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return `${o.emoji} **${o.label}** — ${v} (${pct}%)`;
            });
            await msg.edit({
              embeds: [{
                title: `📊 ${poll.question} (FERMÉ)`,
                description: lines.join('\n') + `\n\n_Total : ${total} vote(s)_`,
                color: 0xFF0000,
              }],
              components: [],
            }).catch(() => {});
          }
        }
        STMT_POLL_CLOSE.run(poll.id);
      } catch (err) {
        console.warn(`[3packs-scheduler] poll close fail ${poll.id}:`, err.message);
      }
    }
  }, 60_000);
  console.log('[3packs] poll-scheduler démarré (tick 60s)');
}

function start(client) {
  startLockdownScheduler(client);
  startPollScheduler(client);
}

module.exports = { start };
