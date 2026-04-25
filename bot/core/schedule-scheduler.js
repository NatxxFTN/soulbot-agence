'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE SCHEDULER — tick 30s, exécute les schedules dus
// ═══════════════════════════════════════════════════════════════════════════

const storage = require('./schedule-storage');
const botLogger = require('./logger');

async function executeOne(client, row) {
  const guild = client.guilds.cache.get(row.guild_id);
  if (!guild) {
    storage.markFailed(row.id, 'guild not found');
    return;
  }

  const params = row.params ? JSON.parse(row.params) : {};
  const action = row.action;

  try {
    if (action === 'ban') {
      await guild.members.ban(row.target_id, {
        reason: `[schedule #${row.id}] ${row.reason || 'scheduled'}`,
      });
    } else if (action === 'unban') {
      await guild.members.unban(row.target_id, `[schedule #${row.id}] ${row.reason || ''}`).catch(() => {});
    } else if (action === 'kick') {
      const m = await guild.members.fetch(row.target_id).catch(() => null);
      if (m) await m.kick(`[schedule #${row.id}] ${row.reason || 'scheduled'}`);
    } else if (action === 'role_add') {
      const m = await guild.members.fetch(row.target_id).catch(() => null);
      if (m && params.roleId) await m.roles.add(params.roleId, `[schedule #${row.id}]`);
    } else if (action === 'role_remove') {
      const m = await guild.members.fetch(row.target_id).catch(() => null);
      if (m && params.roleId) await m.roles.remove(params.roleId, `[schedule #${row.id}]`);
    } else if (action === 'message') {
      const ch = await guild.channels.fetch(row.target_id).catch(() => null);
      if (ch && params.content) await ch.send({ content: String(params.content).slice(0, 1900) });
    } else {
      storage.markFailed(row.id, `unknown action ${action}`);
      return;
    }

    storage.markExecuted(row.id);
    botLogger.event?.({
      eventType: 'schedule_executed',
      guildId  : row.guild_id,
      userId   : row.author_id,
      message  : `Schedule #${row.id} (${action}) exécuté`,
    });
  } catch (err) {
    storage.markFailed(row.id, err.message || String(err));
    botLogger.error?.({
      eventType: 'schedule_failed',
      guildId  : row.guild_id,
      message  : `Schedule #${row.id} (${action}) échoué: ${err.message}`,
    });
  }
}

async function tick(client) {
  const due = storage.getDue();
  for (const row of due) {
    await executeOne(client, row);
  }
}

function startScheduleScheduler(client) {
  console.log('[schedule-scheduler] Démarré (tick 30s)');
  setInterval(() => { tick(client).catch(() => {}); }, 30_000);
  setTimeout(() => { tick(client).catch(() => {}); }, 10_000);
}

module.exports = { startScheduleScheduler };
