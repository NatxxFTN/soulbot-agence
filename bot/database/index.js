'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH  = path.join(DATA_DIR, 'bot.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  /* ---- Paramètres globaux par guilde ---- */
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id            TEXT PRIMARY KEY,
    prefix              TEXT    NOT NULL DEFAULT ';',
    stats_enabled       INTEGER NOT NULL DEFAULT 1,
    -- Starboard
    star_enabled        INTEGER NOT NULL DEFAULT 0,
    star_channel_id     TEXT,
    star_threshold      INTEGER NOT NULL DEFAULT 3,
    star_emoji          TEXT    NOT NULL DEFAULT '⭐',
    -- Rôles spéciaux
    role_badge_id       TEXT,
    role_boost_id       TEXT,
    role_bday_id        TEXT,
    role_voc_id         TEXT,
    -- StatEmbed
    statembed_channel_id  TEXT,
    statembed_message_id  TEXT,
    created_at          INTEGER NOT NULL DEFAULT (unixepoch())
  );

  /* ---- Stats par utilisateur par guilde ---- */
  CREATE TABLE IF NOT EXISTS user_stats (
    guild_id        TEXT    NOT NULL,
    user_id         TEXT    NOT NULL,
    messages        INTEGER NOT NULL DEFAULT 0,
    voice_seconds   INTEGER NOT NULL DEFAULT 0,
    last_message_at INTEGER,
    last_voice_at   INTEGER,
    PRIMARY KEY (guild_id, user_id)
  );

  /* ---- Stats par salon par utilisateur ---- */
  CREATE TABLE IF NOT EXISTS user_channel_stats (
    guild_id    TEXT    NOT NULL,
    channel_id  TEXT    NOT NULL,
    user_id     TEXT    NOT NULL,
    messages    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, channel_id, user_id)
  );

  /* ---- Sessions vocales actives ---- */
  CREATE TABLE IF NOT EXISTS voice_sessions (
    guild_id    TEXT    NOT NULL,
    user_id     TEXT    NOT NULL,
    channel_id  TEXT    NOT NULL,
    joined_at   INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  /* ---- Anniversaires ---- */
  CREATE TABLE IF NOT EXISTS birthdays (
    guild_id  TEXT    NOT NULL,
    user_id   TEXT    NOT NULL,
    day       INTEGER NOT NULL,
    month     INTEGER NOT NULL,
    year      INTEGER,
    PRIMARY KEY (guild_id, user_id)
  );

  /* ---- Sondages ---- */
  CREATE TABLE IF NOT EXISTS polls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT    NOT NULL,
    channel_id  TEXT    NOT NULL,
    message_id  TEXT,
    creator_id  TEXT    NOT NULL,
    question    TEXT    NOT NULL,
    options     TEXT    NOT NULL,   -- JSON array
    active      INTEGER NOT NULL DEFAULT 1,
    ends_at     INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  /* ---- Votes de sondage ---- */
  CREATE TABLE IF NOT EXISTS poll_votes (
    poll_id      INTEGER NOT NULL,
    user_id      TEXT    NOT NULL,
    option_index INTEGER NOT NULL,
    PRIMARY KEY (poll_id, user_id),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
  );

  /* ---- Messages du starboard ---- */
  CREATE TABLE IF NOT EXISTS starboard_entries (
    guild_id             TEXT    NOT NULL,
    original_channel_id  TEXT    NOT NULL,
    original_message_id  TEXT    NOT NULL,
    starboard_message_id TEXT,
    author_id            TEXT    NOT NULL,
    star_count           INTEGER NOT NULL DEFAULT 0,
    created_at           INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, original_message_id)
  );

  /* ---- Réactions étoile (anti-dupe) ---- */
  CREATE TABLE IF NOT EXISTS star_reactions (
    guild_id    TEXT NOT NULL,
    message_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    PRIMARY KEY (guild_id, message_id, user_id)
  );

  /* ---- Permissions rôles pour le star ---- */
  CREATE TABLE IF NOT EXISTS star_role_permissions (
    guild_id    TEXT NOT NULL,
    role_id     TEXT NOT NULL,
    permission  TEXT NOT NULL CHECK(permission IN ('allow', 'deny')),
    PRIMARY KEY (guild_id, role_id)
  );

  /* ---- Rôles Ancien (paliers d'ancienneté) ---- */
  CREATE TABLE IF NOT EXISTS ancient_roles (
    guild_id        TEXT    NOT NULL,
    role_id         TEXT    NOT NULL,
    days_threshold  INTEGER NOT NULL,
    cumulative      INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, role_id)
  );

  /* ---- Logs de modération ---- */
  CREATE TABLE IF NOT EXISTS mod_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT    NOT NULL,
    action          TEXT    NOT NULL,
    user_id         TEXT,
    user_tag        TEXT,
    moderator_id    TEXT    NOT NULL,
    moderator_tag   TEXT    NOT NULL,
    reason          TEXT,
    duration        TEXT,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
  );

  /* ---- Avertissements ---- */
  CREATE TABLE IF NOT EXISTS warnings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id      TEXT    NOT NULL,
    user_id       TEXT    NOT NULL,
    user_tag      TEXT    NOT NULL,
    moderator_id  TEXT    NOT NULL,
    moderator_tag TEXT    NOT NULL,
    reason        TEXT    NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  /* ---- Greeting (bienvenue / départ) ---- */
  CREATE TABLE IF NOT EXISTS greeting_config (
    guild_id         TEXT    PRIMARY KEY,
    join_channel_id  TEXT,
    join_message     TEXT    NOT NULL DEFAULT 'Bienvenue {user} sur **{server}** ! 🎉',
    join_enabled     INTEGER NOT NULL DEFAULT 0,
    leave_channel_id TEXT,
    leave_message    TEXT    NOT NULL DEFAULT '{username} a quitté **{server}**. 👋',
    leave_enabled    INTEGER NOT NULL DEFAULT 0,
    updated_at       INTEGER
  );

  /* ---- Giveaways ---- */
  CREATE TABLE IF NOT EXISTS giveaways (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id      TEXT    NOT NULL,
    channel_id    TEXT    NOT NULL,
    message_id    TEXT    NOT NULL UNIQUE,
    prize         TEXT    NOT NULL,
    winners_count INTEGER NOT NULL DEFAULT 1,
    ends_at       INTEGER NOT NULL,
    created_by    TEXT    NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    ended         INTEGER NOT NULL DEFAULT 0,
    winner_ids    TEXT
  );

  CREATE TABLE IF NOT EXISTS giveaway_participants (
    giveaway_id INTEGER NOT NULL,
    user_id     TEXT    NOT NULL,
    joined_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (giveaway_id, user_id),
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_gw_guild   ON giveaways(guild_id);
  CREATE INDEX IF NOT EXISTS idx_gw_ends    ON giveaways(ends_at, ended);
  CREATE INDEX IF NOT EXISTS idx_gw_message ON giveaways(message_id);

  /* ---- Configuration ticket par serveur ---- */
  CREATE TABLE IF NOT EXISTS ticket_config (
    guild_id         TEXT PRIMARY KEY,
    category_id      TEXT,
    log_channel_id   TEXT,
    staff_role_id    TEXT,
    panel_channel_id TEXT,
    panel_message_id TEXT,
    ticket_counter   INTEGER NOT NULL DEFAULT 0
  );

  /* ---- Tickets ---- */
  CREATE TABLE IF NOT EXISTS tickets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id      TEXT    NOT NULL,
    user_id       TEXT    NOT NULL,
    channel_id    TEXT    NOT NULL UNIQUE,
    ticket_number INTEGER NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'open',
    claimed_by    TEXT,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    closed_at     INTEGER,
    closed_by     TEXT,
    deleted_at    INTEGER
  );

  /* ---- Participants ajoutés dans un ticket ---- */
  CREATE TABLE IF NOT EXISTS ticket_participants (
    ticket_id INTEGER NOT NULL,
    user_id   TEXT    NOT NULL,
    added_by  TEXT    NOT NULL,
    added_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (ticket_id, user_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  );

  /* ---- Logs des opérations template ---- */
  CREATE TABLE IF NOT EXISTS template_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    action        TEXT    NOT NULL,
    template_name TEXT    NOT NULL,
    user_id       TEXT    NOT NULL,
    guild_id      TEXT    NOT NULL,
    guild_name    TEXT,
    mode          TEXT,
    stats         TEXT,
    success       INTEGER NOT NULL,
    error         TEXT,
    duration_ms   INTEGER,
    timestamp     INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tpl_logs_user     ON template_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_tpl_logs_template ON template_logs(template_name);

  /* ─── Index de performance ─── */
  CREATE INDEX IF NOT EXISTS idx_user_stats_guild    ON user_stats (guild_id, messages DESC);
  CREATE INDEX IF NOT EXISTS idx_user_stats_voice    ON user_stats (guild_id, voice_seconds DESC);
  CREATE INDEX IF NOT EXISTS idx_chan_stats_guild    ON user_channel_stats (guild_id, channel_id);
  CREATE INDEX IF NOT EXISTS idx_bdays_month         ON birthdays (month, day);
  CREATE INDEX IF NOT EXISTS idx_star_entries_guild  ON starboard_entries (guild_id, star_count DESC);
  CREATE INDEX IF NOT EXISTS idx_tickets_guild       ON tickets (guild_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_status      ON tickets (guild_id, status);
  CREATE INDEX IF NOT EXISTS idx_tickets_channel     ON tickets (channel_id);

  /* ---- Logs de reset serveur ---- */
  CREATE TABLE IF NOT EXISTS reset_logs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id          TEXT    NOT NULL,
    guild_name        TEXT    NOT NULL,
    user_id           TEXT    NOT NULL,
    auto_backup_name  TEXT    NOT NULL,
    channels_deleted  INTEGER NOT NULL DEFAULT 0,
    roles_deleted     INTEGER NOT NULL DEFAULT 0,
    emojis_deleted    INTEGER NOT NULL DEFAULT 0,
    duration_ms       INTEGER,
    success           INTEGER NOT NULL,
    error             TEXT,
    timestamp         INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_reset_logs_guild ON reset_logs(guild_id);
  CREATE INDEX IF NOT EXISTS idx_reset_logs_user  ON reset_logs(user_id);

  /* ---- Cooldown reset par serveur ---- */
  CREATE TABLE IF NOT EXISTS reset_cooldowns (
    guild_id      TEXT    PRIMARY KEY,
    last_reset_at INTEGER NOT NULL
  );
`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** S'assure qu'une guilde est présente dans guild_settings */
function ensureGuild(guildId) {
  db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)').run(guildId);
}

/** Récupère les settings d'une guilde (crée si inexistant) */
function getGuildSettings(guildId) {
  ensureGuild(guildId);
  return db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
}

// Whitelist exhaustive des colonnes modifiables via setGuildSetting.
// POURQUOI une whitelist et non une blacklist : toute colonne non listée ici
// est inaccessible par construction. Si on ajoute une colonne sensible à la table,
// elle est protégée par défaut — pas besoin de penser à la bloquer.
const ALLOWED_GUILD_FIELDS = new Set([
  'prefix',
  'stats_enabled',
  'star_enabled',
  'star_channel_id',
  'star_threshold',
  'star_emoji',
  'role_badge_id',
  'role_boost_id',
  'role_bday_id',
  'role_voc_id',
  'statembed_channel_id',
  'statembed_message_id',
]);

/** Met à jour un champ dans guild_settings via whitelist stricte */
function setGuildSetting(guildId, field, value) {
  // POURQUOI throw et non return silencieux : un champ non autorisé indique
  // soit un bug (faute de frappe), soit une tentative d'injection.
  // Les deux doivent être visibles immédiatement, pas absorbés silencieusement.
  if (!ALLOWED_GUILD_FIELDS.has(field)) {
    throw new Error(`[Database] setGuildSetting — champ non autorisé : "${field}"`);
  }
  ensureGuild(guildId);
  // Le nom de colonne est maintenant garanti propre par la whitelist.
  // La valeur reste paramétrée (?) — double protection.
  db.prepare(`UPDATE guild_settings SET ${field} = ? WHERE guild_id = ?`).run(value, guildId);
}

module.exports = { db, ensureGuild, getGuildSettings, setGuildSetting };
