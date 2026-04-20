'use strict';

const { db } = require('../database');

const INSERT = db.prepare(`
  INSERT INTO bot_logs
    (timestamp, level, category, event_type, guild_id, guild_name,
     user_id, user_name, channel_id, command_name, message, metadata,
     duration_ms, success)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function log(options) {
  const {
    level       = 'info',
    category    = 'system',
    eventType   = 'generic',
    guildId     = null,
    guildName   = null,
    userId      = null,
    userName    = null,
    channelId   = null,
    commandName = null,
    message,
    metadata    = null,
    durationMs  = null,
    success     = true,
  } = options;

  try {
    INSERT.run(
      Date.now(), level, category, eventType,
      guildId, guildName, userId, userName,
      channelId, commandName, message,
      metadata ? JSON.stringify(metadata) : null,
      durationMs, success ? 1 : 0
    );
  } catch (err) {
    process.stderr.write(`[botLogger] DB write error: ${err.message}\n`);
  }
}

const botLogger = {
  log,

  command(opts) { return log({ ...opts, level: 'command', category: 'command' }); },
  event(opts)   { return log({ ...opts, level: 'info',    category: 'event' }); },
  error(opts)   { return log({ ...opts, level: 'error',   category: 'system', success: false }); },
  modAction(opts) { return log({ ...opts, level: 'info',  category: 'moderation' }); },

  getRecent(limit = 100) {
    return db.prepare('SELECT * FROM bot_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  },

  getByGuild(guildId, limit = 50) {
    return db.prepare(
      'SELECT * FROM bot_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(guildId, limit);
  },

  getSince(sinceTimestamp) {
    return db.prepare(
      'SELECT * FROM bot_logs WHERE timestamp > ? ORDER BY timestamp ASC'
    ).all(sinceTimestamp);
  },

  getStats() {
    const totalCommands = db.prepare(
      "SELECT COUNT(*) as c FROM bot_logs WHERE category = 'command'"
    ).get().c;
    const totalErrors = db.prepare(
      "SELECT COUNT(*) as c FROM bot_logs WHERE level = 'error'"
    ).get().c;
    const last24h = db.prepare(
      'SELECT COUNT(*) as c FROM bot_logs WHERE timestamp > ?'
    ).get(Date.now() - 24 * 3600_000).c;
    const uniqueGuilds = db.prepare(
      'SELECT COUNT(DISTINCT guild_id) as c FROM bot_logs WHERE guild_id IS NOT NULL'
    ).get().c;
    return { totalCommands, totalErrors, last24h, uniqueGuilds };
  },
};

module.exports = botLogger;
