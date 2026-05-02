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

  /* ---- Logs centralisés bot (dashboard Phase 1) ---- */
  CREATE TABLE IF NOT EXISTS bot_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp    INTEGER NOT NULL,
    level        TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    event_type   TEXT    NOT NULL,
    guild_id     TEXT,
    guild_name   TEXT,
    user_id      TEXT,
    user_name    TEXT,
    channel_id   TEXT,
    command_name TEXT,
    message      TEXT    NOT NULL,
    metadata     TEXT,
    duration_ms  INTEGER,
    success      INTEGER DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON bot_logs(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_level     ON bot_logs(level);
  CREATE INDEX IF NOT EXISTS idx_logs_guild     ON bot_logs(guild_id);
  CREATE INDEX IF NOT EXISTS idx_logs_user      ON bot_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_logs_category  ON bot_logs(category);

  CREATE TABLE IF NOT EXISTS bot_stats_hourly (
    hour_timestamp    INTEGER PRIMARY KEY,
    commands_count    INTEGER DEFAULT 0,
    errors_count      INTEGER DEFAULT 0,
    mod_actions_count INTEGER DEFAULT 0,
    unique_users      INTEGER DEFAULT 0,
    unique_guilds     INTEGER DEFAULT 0
  );

  /* ---- Anti-Leak configuration ---- */
  CREATE TABLE IF NOT EXISTS antileak_config (
    guild_id               TEXT    PRIMARY KEY,
    enabled                INTEGER NOT NULL DEFAULT 0,
    detect_discord_token   INTEGER NOT NULL DEFAULT 1,
    detect_ip              INTEGER NOT NULL DEFAULT 1,
    detect_email           INTEGER NOT NULL DEFAULT 1,
    detect_phone           INTEGER NOT NULL DEFAULT 0,
    sanction_discord_token TEXT    NOT NULL DEFAULT 'delete',
    sanction_ip            TEXT    NOT NULL DEFAULT 'delete',
    sanction_email         TEXT    NOT NULL DEFAULT 'delete',
    sanction_phone         TEXT    NOT NULL DEFAULT 'delete',
    logs_channel_id        TEXT,
    updated_at             INTEGER,
    updated_by             TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_antileak_guild ON antileak_config(guild_id);

  CREATE TABLE IF NOT EXISTS antileak_whitelist (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id  TEXT    NOT NULL,
    role_id   TEXT    NOT NULL,
    added_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    added_by  TEXT,
    UNIQUE(guild_id, role_id)
  );
  CREATE INDEX IF NOT EXISTS idx_antileak_wl_guild ON antileak_whitelist(guild_id);

  /* ---- Anti-Spam configuration ---- */
  CREATE TABLE IF NOT EXISTS antispam_config (
    guild_id                TEXT    PRIMARY KEY,
    enabled                 INTEGER NOT NULL DEFAULT 0,
    flood_threshold         INTEGER NOT NULL DEFAULT 5,
    flood_window_seconds    INTEGER NOT NULL DEFAULT 5,
    flood_sanction          TEXT    NOT NULL DEFAULT 'timeout',
    mentions_threshold      INTEGER NOT NULL DEFAULT 5,
    mentions_sanction       TEXT    NOT NULL DEFAULT 'timeout',
    repeat_threshold        INTEGER NOT NULL DEFAULT 3,
    repeat_sanction         TEXT    NOT NULL DEFAULT 'delete',
    caps_enabled            INTEGER NOT NULL DEFAULT 0,
    caps_threshold          INTEGER NOT NULL DEFAULT 70,
    caps_min_length         INTEGER NOT NULL DEFAULT 10,
    caps_sanction           TEXT    NOT NULL DEFAULT 'delete',
    logs_channel_id         TEXT,
    updated_at              INTEGER,
    updated_by              TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_antispam_guild ON antispam_config(guild_id);

  CREATE TABLE IF NOT EXISTS antispam_whitelist (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id  TEXT    NOT NULL,
    role_id   TEXT    NOT NULL,
    added_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    added_by  TEXT,
    UNIQUE(guild_id, role_id)
  );
  CREATE INDEX IF NOT EXISTS idx_antispam_wl_guild ON antispam_whitelist(guild_id);

  /* ---- Nuke Premium — configuration par serveur ---- */
  CREATE TABLE IF NOT EXISTS nuke_config (
    guild_id         TEXT    PRIMARY KEY,
    targets_channels INTEGER NOT NULL DEFAULT 1,
    targets_roles    INTEGER NOT NULL DEFAULT 1,
    targets_emojis   INTEGER NOT NULL DEFAULT 1,
    updated_at       INTEGER,
    updated_by       TEXT
  );

  /* ---- Lockdown — état par serveur ---- */
  CREATE TABLE IF NOT EXISTS lockdown_config (
    guild_id      TEXT    PRIMARY KEY,
    active        INTEGER NOT NULL DEFAULT 0,
    locked_by     TEXT,
    locked_at     INTEGER,
    reason        TEXT,
    locked_count  INTEGER NOT NULL DEFAULT 0
  );

  /* ---- Lockdown — canaux verrouillés ---- */
  CREATE TABLE IF NOT EXISTS lockdown_channels (
    guild_id    TEXT    NOT NULL,
    channel_id  TEXT    NOT NULL,
    locked_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, channel_id)
  );

  /* ---- Raidmode — configuration ---- */
  CREATE TABLE IF NOT EXISTS raidmode_config (
    guild_id        TEXT    PRIMARY KEY,
    active          INTEGER NOT NULL DEFAULT 0,
    join_threshold  INTEGER NOT NULL DEFAULT 5,
    join_window_sec INTEGER NOT NULL DEFAULT 10,
    action          TEXT    NOT NULL DEFAULT 'kick',
    enabled_by      TEXT,
    enabled_at      INTEGER,
    auto_disable    INTEGER NOT NULL DEFAULT 1
  );

  /* ---- Raidmode — détections récentes ---- */
  CREATE TABLE IF NOT EXISTS raidmode_detections (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT    NOT NULL,
    user_id    TEXT    NOT NULL,
    user_tag   TEXT,
    action     TEXT    NOT NULL,
    joined_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_raidmode_det_guild ON raidmode_detections(guild_id, joined_at DESC);

  /* ---- Massban — logs ---- */
  CREATE TABLE IF NOT EXISTS massban_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT    NOT NULL,
    banned_by    TEXT    NOT NULL,
    banned_ids   TEXT    NOT NULL,
    reason       TEXT,
    success      INTEGER NOT NULL DEFAULT 0,
    failed       INTEGER NOT NULL DEFAULT 0,
    timestamp    INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_massban_guild ON massban_logs(guild_id, timestamp DESC);

  /* ---- Modération — configuration par serveur ---- */
  CREATE TABLE IF NOT EXISTS mod_config (
    guild_id                  TEXT    PRIMARY KEY,
    logs_channel_id           TEXT,
    mod_role_id               TEXT,
    muted_role_id             TEXT,
    default_mute_duration     INTEGER NOT NULL DEFAULT 600,
    default_timeout_duration  INTEGER NOT NULL DEFAULT 600,
    dm_sanctioned             INTEGER NOT NULL DEFAULT 1,
    require_reason            INTEGER NOT NULL DEFAULT 0,
    updated_at                INTEGER,
    updated_by                TEXT
  );

  /* ---- Warns — configuration par serveur ---- */
  CREATE TABLE IF NOT EXISTS warn_config (
    guild_id         TEXT    PRIMARY KEY,
    enabled          INTEGER NOT NULL DEFAULT 1,
    logs_channel_id  TEXT,
    thresholds       TEXT    NOT NULL DEFAULT '[]',
    expiration_days  INTEGER NOT NULL DEFAULT 30,
    dm_warned        INTEGER NOT NULL DEFAULT 1,
    updated_at       INTEGER,
    updated_by       TEXT
  );

  /* ---- Warns — entrées avec expiration ---- */
  CREATE TABLE IF NOT EXISTS warns (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT    NOT NULL,
    user_id      TEXT    NOT NULL,
    moderator_id TEXT    NOT NULL,
    reason       TEXT,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at   INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_warns_guild_user ON warns(guild_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_warns_expires    ON warns(expires_at);

  /* ---- Logs système — config globale par serveur ---- */
  CREATE TABLE IF NOT EXISTS guild_log_config (
    guild_id    TEXT    PRIMARY KEY,
    channel_id  TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER,
    updated_by  TEXT
  );

  /* ---- Logs système — toggles par event type ---- */
  CREATE TABLE IF NOT EXISTS guild_log_events (
    guild_id    TEXT    NOT NULL,
    event_type  TEXT    NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (guild_id, event_type)
  );
  CREATE INDEX IF NOT EXISTS idx_guild_log_events_guild ON guild_log_events(guild_id);

  /* ═══ LOGS V3 ULTIMATE — schéma 2026-04-24 ═════════════════════════ */

  /* Routing par event → channel. Permet un salon par type. */
  CREATE TABLE IF NOT EXISTS guild_log_routing (
    guild_id    TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    channel_id  TEXT NOT NULL,
    PRIMARY KEY (guild_id, event_type)
  );
  CREATE INDEX IF NOT EXISTS idx_log_routing_guild ON guild_log_routing(guild_id);

  /* Format personnalisé par event : template + couleur + icon. */
  CREATE TABLE IF NOT EXISTS guild_log_formats (
    guild_id    TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    template    TEXT,
    color_hex   TEXT,
    icon_emoji  TEXT,
    enabled     INTEGER DEFAULT 1,
    PRIMARY KEY (guild_id, event_type)
  );

  /* Filtres (ignore user, bot, channel, role). */
  CREATE TABLE IF NOT EXISTS guild_log_filters (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id      TEXT NOT NULL,
    event_type    TEXT NOT NULL,
    filter_type   TEXT NOT NULL,
    filter_value  TEXT NOT NULL,
    created_at    INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_log_filters_guild_event ON guild_log_filters(guild_id, event_type);

  /* Historique persistant — support search / stats. */
  CREATE TABLE IF NOT EXISTS guild_log_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    actor_id    TEXT,
    target_id   TEXT,
    channel_id  TEXT,
    data_json   TEXT,
    created_at  INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_log_history_guild_date ON guild_log_history(guild_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_log_history_event     ON guild_log_history(guild_id, event_type);

  /* Stats journalières pré-calculées. */
  CREATE TABLE IF NOT EXISTS guild_log_stats_daily (
    guild_id    TEXT NOT NULL,
    date        TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    count       INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, date, event_type)
  );
`);

// ── ALTER TABLE guild_log_config — colonnes V3 (idempotent) ──────────────────
const LOGS_V3_CONFIG_COLS = {
  default_channel_id: 'TEXT',
  theme             : "TEXT DEFAULT 'premium'",
  global_enabled    : 'INTEGER DEFAULT 1',
  category_id       : 'TEXT',
  version           : "TEXT DEFAULT 'v2'",
};
for (const [col, type] of Object.entries(LOGS_V3_CONFIG_COLS)) {
  try { db.exec(`ALTER TABLE guild_log_config ADD COLUMN ${col} ${type}`); } catch { /* déjà présent */ }
}

// Backfill : les guildes V2 héritent de channel_id → default_channel_id.
try {
  db.prepare(`
    UPDATE guild_log_config
    SET default_channel_id = channel_id
    WHERE default_channel_id IS NULL AND channel_id IS NOT NULL
  `).run();
} catch { /* ignore */ }

// ═══ 3-PACKS PREMIUM — schéma 2026-04-28 ════════════════════════════════════

db.exec(`
  /* ---- Anti-raid extension (utilise raidmode_config existant + columns extras) ---- */
  CREATE TABLE IF NOT EXISTS antiraid_recent_joins (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_antiraid_joins_ts ON antiraid_recent_joins(guild_id, joined_at DESC);

  /* ---- Lockdowns à durée (auto-unlock) ---- */
  CREATE TABLE IF NOT EXISTS lockdown_timed (
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    locked_by  TEXT,
    PRIMARY KEY (guild_id, channel_id)
  );
  CREATE INDEX IF NOT EXISTS idx_lockdown_timed_exp ON lockdown_timed(expires_at);

  /* ---- Reaction roles ---- */
  CREATE TABLE IF NOT EXISTS guild_reaction_roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    channel_id  TEXT NOT NULL,
    message_id  TEXT NOT NULL,
    emoji       TEXT NOT NULL,
    role_id     TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(guild_id, message_id, emoji)
  );
  CREATE INDEX IF NOT EXISTS idx_rr_msg ON guild_reaction_roles(message_id);

  /* ---- Autoroles ---- */
  CREATE TABLE IF NOT EXISTS guild_autoroles (
    guild_id   TEXT NOT NULL,
    role_id    TEXT NOT NULL,
    added_by   TEXT,
    added_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, role_id)
  );

  /* ---- XP / Level (système simple) ---- */
  CREATE TABLE IF NOT EXISTS guild_xp (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    xp        INTEGER NOT NULL DEFAULT 0,
    level     INTEGER NOT NULL DEFAULT 0,
    last_msg  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_xp_guild ON guild_xp(guild_id, xp DESC);

  /* ---- Suggestion advanced (votes par bouton, séparé du suggestion existant) ---- */
  CREATE TABLE IF NOT EXISTS suggestionv2 (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT NOT NULL,
    channel_id   TEXT NOT NULL,
    message_id   TEXT NOT NULL UNIQUE,
    author_id    TEXT NOT NULL,
    text         TEXT NOT NULL,
    upvotes      INTEGER NOT NULL DEFAULT 0,
    downvotes    INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'open',
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS suggestionv2_votes (
    suggestion_id INTEGER NOT NULL,
    user_id       TEXT NOT NULL,
    vote          INTEGER NOT NULL,
    PRIMARY KEY (suggestion_id, user_id)
  );
`);

// Add columns to raidmode_config for antiraid pack (idempotent)
const ANTIRAID_COLS = {
  detection_window_sec: 'INTEGER DEFAULT 30',
  detection_threshold : 'INTEGER DEFAULT 10',
  lockdown_on_raid    : 'INTEGER DEFAULT 0',
};
for (const [col, type] of Object.entries(ANTIRAID_COLS)) {
  try { db.exec(`ALTER TABLE raidmode_config ADD COLUMN ${col} ${type}`); } catch { /* déjà présent */ }
}

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

// ── Migration greeting_config — colonnes embed/dm (ajout sûr) ────────────────
const GREETING_EXTRA_COLS = ['join_embed', 'join_dm', 'join_dm_embed', 'leave_embed', 'leave_dm', 'leave_dm_embed'];
for (const col of GREETING_EXTRA_COLS) {
  try { db.exec(`ALTER TABLE greeting_config ADD COLUMN ${col} TEXT`); } catch { /* déjà présent */ }
}

// ── Migration ticket_config — nouvelles colonnes (ajout sûr) ─────────────────
const TICKET_EXTRA_COLS = {
  open_message        : 'TEXT',
  open_embed          : 'TEXT',
  close_message       : 'TEXT',
  close_embed         : 'TEXT',
  enabled             : 'INTEGER DEFAULT 0',
  transcript_enabled  : 'INTEGER DEFAULT 1',
  max_per_user        : 'INTEGER DEFAULT 1',
  cooldown_seconds    : 'INTEGER DEFAULT 0',
  updated_by          : 'TEXT',
};
for (const [col, type] of Object.entries(TICKET_EXTRA_COLS)) {
  try { db.exec(`ALTER TABLE ticket_config ADD COLUMN ${col} ${type}`); } catch { /* déjà présent */ }
}

// ── Welcome v2 — clean reset ──────────────────────────────────────────────────
db.exec('DROP TABLE IF EXISTS welcome_config');
db.exec('DROP TABLE IF EXISTS welcome_fields');
db.exec('DROP TABLE IF EXISTS welcome_auto_roles');
db.exec('DROP TABLE IF EXISTS welcome_stats');

db.exec(`
  CREATE TABLE welcome_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'embed',
    channel_id TEXT,
    secondary_channel_id TEXT,
    text_content TEXT,
    text_reply INTEGER DEFAULT 0,
    mention_user INTEGER DEFAULT 1,
    mention_then_delete INTEGER DEFAULT 0,
    embed_title TEXT,
    embed_title_url TEXT,
    embed_description TEXT,
    embed_color TEXT DEFAULT '#FF0000',
    embed_thumbnail_url TEXT,
    embed_thumbnail_source TEXT DEFAULT 'custom',
    embed_image_url TEXT,
    embed_image_source TEXT DEFAULT 'custom',
    embed_author_name TEXT,
    embed_author_icon TEXT,
    embed_author_icon_source TEXT DEFAULT 'custom',
    embed_author_url TEXT,
    embed_footer_text TEXT,
    embed_footer_icon TEXT,
    embed_footer_icon_source TEXT DEFAULT 'custom',
    embed_timestamp INTEGER DEFAULT 0,
    dm_enabled INTEGER DEFAULT 0,
    dm_content TEXT,
    dm_embed_enabled INTEGER DEFAULT 0,
    dm_embed_title TEXT,
    dm_embed_description TEXT,
    dm_embed_color TEXT,
    dm_delay_seconds INTEGER DEFAULT 0,
    auto_delete_seconds INTEGER DEFAULT 0,
    ignore_bots INTEGER DEFAULT 1,
    min_account_age_days INTEGER DEFAULT 0,
    cooldown_seconds INTEGER DEFAULT 0,
    require_role_id TEXT,
    active_hours_start INTEGER DEFAULT -1,
    active_hours_end INTEGER DEFAULT -1,
    active_weekdays TEXT DEFAULT '0,1,2,3,4,5,6',
    updated_at INTEGER,
    updated_by TEXT
  )
`);
db.exec(`
  CREATE TABLE welcome_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    field_order INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    inline INTEGER DEFAULT 0,
    created_at INTEGER
  )
`);
db.exec(`
  CREATE TABLE welcome_auto_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at INTEGER,
    UNIQUE(guild_id, role_id)
  )
`);
db.exec(`
  CREATE TABLE welcome_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_tag TEXT,
    triggered_at INTEGER,
    account_age_days INTEGER,
    dm_sent INTEGER DEFAULT 0
  )
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_welcome_fields_guild ON welcome_fields(guild_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_welcome_auto_roles_guild ON welcome_auto_roles(guild_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_welcome_stats_guild ON welcome_stats(guild_id)');

// ─── Pack Audit & Modération avancée ────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_quarantine (
    guild_id            TEXT    NOT NULL,
    user_id             TEXT    NOT NULL,
    quarantined_by      TEXT    NOT NULL,
    reason              TEXT,
    original_roles_json TEXT    NOT NULL,
    quarantined_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS guild_role_locks (
    guild_id   TEXT    NOT NULL,
    role_id    TEXT    NOT NULL,
    locked_by  TEXT    NOT NULL,
    locked_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS guild_mod_actions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT    NOT NULL,
    user_id      TEXT    NOT NULL,
    moderator_id TEXT    NOT NULL,
    action_type  TEXT    NOT NULL,
    reason       TEXT,
    duration_ms  INTEGER,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_modactions_guild_user      ON guild_mod_actions(guild_id, user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_modactions_guild_moderator ON guild_mod_actions(guild_id, moderator_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_modactions_created         ON guild_mod_actions(created_at DESC)');

module.exports = { db, ensureGuild, getGuildSettings, setGuildSetting };
