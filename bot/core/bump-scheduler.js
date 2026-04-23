'use strict';

// ── Bump Scheduler — check toutes les 60s les rappels dus ────────────────────
// Timers persistants (source de vérité = DB `bump_reminders`)
// Le scheduler ne stocke RIEN en mémoire — il redémarre propre au boot.

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('./emojis');
const storage = require('./bump-storage');

let schedulerStarted = false;
let intervalId       = null;

function startBumpScheduler(client) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  intervalId = setInterval(() => {
    checkPendingReminders(client).catch(err =>
      console.error('[bump-scheduler] tick error:', err.message),
    );
  }, 60 * 1000);

  // Premier check différé (10s) pour laisser le bot se stabiliser
  setTimeout(() => checkPendingReminders(client).catch(() => {}), 10 * 1000);

  console.log('[bump-scheduler] Démarré (check toutes les 60s)');
}

function stopBumpScheduler() {
  if (intervalId) clearInterval(intervalId);
  schedulerStarted = false;
  intervalId       = null;
}

async function checkPendingReminders(client) {
  const pending = storage.getPendingReminders();
  if (pending.length === 0) return;

  for (const reminder of pending) {
    const config = storage.getConfig(reminder.guild_id);
    if (!config || !config.enabled || !config.channel_id) {
      storage.markReminderSent(reminder.guild_id);
      continue;
    }

    const guild = await client.guilds.fetch(reminder.guild_id).catch(() => null);
    if (!guild) {
      storage.markReminderSent(reminder.guild_id);
      continue;
    }

    const channel = await guild.channels.fetch(config.channel_id).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      storage.markReminderSent(reminder.guild_id);
      continue;
    }

    await sendBumpReminder(channel, guild, config).catch(err =>
      console.error(`[bump-scheduler] send ${reminder.guild_id}:`, err.message),
    );
    storage.markReminderSent(reminder.guild_id);
  }
}

async function sendBumpReminder(channel, guild, config) {
  const pingPart = config.role_id ? `<@&${config.role_id}>` : '';

  const defaultMessage =
    `${e('ani_diamond')} **C'est l'heure de bump !** ${e('ani_diamond')}\n\n` +
    `${e('btn_tip')} Aide le serveur à grandir en tapant \`/bump\` dans ce salon.`;

  const msgContent = config.custom_message || defaultMessage;

  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(msgContent),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('cat_information')} Tape \`/bump\` maintenant pour rapporter des bumps au leaderboard.\n` +
      `${e('btn_help')} Stats : \`;bumpstats\` · Leaderboard : \`;bumplb\``,
    ),
  );

  await channel.send({
    content   : pingPart || undefined,
    components: [container],
    flags     : MessageFlags.IsComponentsV2,
    allowedMentions: config.role_id ? { roles: [config.role_id] } : { parse: [] },
  });
}

module.exports = {
  startBumpScheduler,
  stopBumpScheduler,
  sendBumpReminder,
};
