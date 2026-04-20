-- Migration : bot_logs + bot_stats_hourly
-- Appliquée automatiquement par bot/database/index.js au démarrage

CREATE TABLE IF NOT EXISTS bot_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp    INTEGER NOT NULL,
  level        TEXT    NOT NULL,   -- info | warn | error | debug | command
  category     TEXT    NOT NULL,   -- command | event | db | api | system | moderation
  event_type   TEXT    NOT NULL,
  guild_id     TEXT,
  guild_name   TEXT,
  user_id      TEXT,
  user_name    TEXT,
  channel_id   TEXT,
  command_name TEXT,
  message      TEXT    NOT NULL,
  metadata     TEXT,              -- JSON libre
  duration_ms  INTEGER,
  success      INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON bot_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level     ON bot_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_guild     ON bot_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_logs_user      ON bot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_category  ON bot_logs(category);

CREATE TABLE IF NOT EXISTS bot_stats_hourly (
  hour_timestamp  INTEGER PRIMARY KEY,
  commands_count  INTEGER DEFAULT 0,
  errors_count    INTEGER DEFAULT 0,
  mod_actions_count INTEGER DEFAULT 0,
  unique_users    INTEGER DEFAULT 0,
  unique_guilds   INTEGER DEFAULT 0
);
