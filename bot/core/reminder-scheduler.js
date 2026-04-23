'use strict';

const storage = require('./reminder-storage');

/**
 * Parse un input "dans 2h", "dans 30min", "dans 3j", "dans 1 semaine"
 * Retourne timestamp ms ou null.
 */
function parseReminderTime(input) {
  if (!input) return null;
  const str = String(input).trim().toLowerCase();

  // Format "dans Xunit"
  const rel = str.match(/^(?:dans\s+)?(\d+)\s*(s|sec|second[es]?|min|minute[s]?|h|heure[s]?|j|jour[s]?|semaine[s]?|mois|an[s]?)$/i);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    let ms = 0;
    if (/^s|sec|second/.test(unit)) ms = n * 1000;
    else if (/^min/.test(unit))     ms = n * 60 * 1000;
    else if (/^h|heure/.test(unit)) ms = n * 60 * 60 * 1000;
    else if (/^j|jour/.test(unit))  ms = n * 24 * 60 * 60 * 1000;
    else if (/semaine/.test(unit))  ms = n * 7 * 24 * 60 * 60 * 1000;
    else if (/mois/.test(unit))     ms = n * 30 * 24 * 60 * 60 * 1000;
    else if (/an/.test(unit))       ms = n * 365 * 24 * 60 * 60 * 1000;
    if (ms > 0) return Date.now() + ms;
  }

  // ISO fallback
  const iso = Date.parse(str);
  if (!isNaN(iso) && iso > Date.now()) return iso;

  return null;
}

async function tick(client) {
  try {
    const due = storage.getExpiringReminders();
    for (const rem of due) {
      try {
        const guild = client.guilds.cache.get(rem.guild_id);
        if (!guild) {
          // Guild disparue → delete reminder
          storage.deleteReminder(rem.id);
          continue;
        }
        const ch = await guild.channels.fetch(rem.channel_id).catch(() => null);
        if (!ch) {
          storage.deleteReminder(rem.id);
          continue;
        }

        const prefix = rem.ping_role_id ? `<@&${rem.ping_role_id}> ` : '';
        await ch.send({
          content: prefix + (rem.message_content || '⏰ Rappel !'),
          allowedMentions: rem.ping_role_id ? { roles: [rem.ping_role_id] } : undefined,
        }).catch(() => {});

        // Recurrence
        if (rem.recurring === 'daily') {
          storage.updateReminder(rem.id, {
            trigger_at: rem.trigger_at + 24 * 60 * 60 * 1000,
            last_triggered: Date.now(),
          });
        } else if (rem.recurring === 'weekly') {
          storage.updateReminder(rem.id, {
            trigger_at: rem.trigger_at + 7 * 24 * 60 * 60 * 1000,
            last_triggered: Date.now(),
          });
        } else if (rem.recurring === 'monthly') {
          storage.updateReminder(rem.id, {
            trigger_at: rem.trigger_at + 30 * 24 * 60 * 60 * 1000,
            last_triggered: Date.now(),
          });
        } else {
          storage.deleteReminder(rem.id);
        }
      } catch (err) {
        console.error('[reminder-scheduler] one:', err);
      }
    }
  } catch (err) {
    console.error('[reminder-scheduler] tick:', err);
  }
}

function startReminderScheduler(client) {
  console.log('[reminder-scheduler] Démarré');
  setInterval(() => tick(client), 60 * 1000);
  // Premier check après 30s
  setTimeout(() => tick(client), 30 * 1000);
}

module.exports = {
  startReminderScheduler,
  parseReminderTime,
};
