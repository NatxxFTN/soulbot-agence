'use strict';

const { db } = require('../database');

// ── Migration defensive : ajouter 'year' si absent ───────────────────────────
// La table `birthdays` existe déjà depuis la création initiale du bot.
// Dans le schéma actuel, year est présent, mais sur d'anciennes DB il peut
// manquer. On tente l'ALTER dans un try/catch pour rester idempotent.
try { db.exec('ALTER TABLE birthdays ADD COLUMN year INTEGER'); } catch { /* déjà présent */ }

// ── Table de config & suivi des annonces ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS bday_config (
    guild_id             TEXT    PRIMARY KEY,
    announcement_channel TEXT,
    message_template     TEXT    NOT NULL DEFAULT '🎂 Joyeux anniversaire {user} ! 🎉 Tout le serveur te souhaite une merveilleuse journée !',
    ping_everyone        INTEGER NOT NULL DEFAULT 0,
    role_id              TEXT,
    enabled              INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS bday_announced (
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    announced_date  TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id, announced_date)
  );
  CREATE INDEX IF NOT EXISTS idx_bday_announced_date ON bday_announced(announced_date);
`);

function getConfig(guildId) {
  try {
    return db.prepare('SELECT * FROM bday_config WHERE guild_id = ?').get(guildId) || null;
  } catch (err) {
    console.error('[bday-storage] getConfig:', err);
    return null;
  }
}

function setConfig(guildId, patch) {
  try {
    const cur = getConfig(guildId) || {
      guild_id: guildId,
      announcement_channel: null,
      message_template: '🎂 Joyeux anniversaire {user} ! 🎉 Tout le serveur te souhaite une merveilleuse journée !',
      ping_everyone: 0,
      role_id: null,
      enabled: 1,
    };
    const merged = { ...cur, ...patch, guild_id: guildId };
    db.prepare(`
      INSERT INTO bday_config (
        guild_id, announcement_channel, message_template, ping_everyone, role_id, enabled
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        announcement_channel = excluded.announcement_channel,
        message_template     = excluded.message_template,
        ping_everyone        = excluded.ping_everyone,
        role_id              = excluded.role_id,
        enabled              = excluded.enabled
    `).run(
      guildId,
      merged.announcement_channel,
      merged.message_template,
      merged.ping_everyone ? 1 : 0,
      merged.role_id,
      merged.enabled ? 1 : 0,
    );
    return true;
  } catch (err) {
    console.error('[bday-storage] setConfig:', err);
    return false;
  }
}

function setBirthday(guildId, userId, day, month, year) {
  try {
    if (year) {
      db.prepare(`
        INSERT INTO birthdays (guild_id, user_id, day, month, year)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
          day = excluded.day,
          month = excluded.month,
          year = excluded.year
      `).run(guildId, userId, day, month, year);
    } else {
      db.prepare(`
        INSERT INTO birthdays (guild_id, user_id, day, month)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
          day = excluded.day,
          month = excluded.month
      `).run(guildId, userId, day, month);
    }
    return true;
  } catch (err) {
    console.error('[bday-storage] setBirthday:', err);
    return false;
  }
}

function removeBirthday(guildId, userId) {
  try {
    const res = db.prepare('DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    return res.changes > 0;
  } catch (err) {
    console.error('[bday-storage] removeBirthday:', err);
    return false;
  }
}

function getBirthday(guildId, userId) {
  try {
    return db.prepare(
      'SELECT * FROM birthdays WHERE guild_id = ? AND user_id = ?'
    ).get(guildId, userId) || null;
  } catch (err) {
    console.error('[bday-storage] getBirthday:', err);
    return null;
  }
}

function listTodaysBirthdays(guildId) {
  try {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    if (guildId) {
      return db.prepare(
        'SELECT * FROM birthdays WHERE guild_id = ? AND day = ? AND month = ?'
      ).all(guildId, day, month);
    }
    return db.prepare('SELECT * FROM birthdays WHERE day = ? AND month = ?').all(day, month);
  } catch (err) {
    console.error('[bday-storage] listTodaysBirthdays:', err);
    return [];
  }
}

/** Liste les N prochains anniversaires à partir d'aujourd'hui. */
function listUpcoming(guildId, count = 5) {
  try {
    const rows = db.prepare(
      'SELECT * FROM birthdays WHERE guild_id = ?'
    ).all(guildId);
    if (!rows.length) return [];

    const now = new Date();
    const todayOrdinal = now.getMonth() * 31 + now.getDate();
    const enriched = rows.map(r => {
      const ord = (r.month - 1) * 31 + r.day;
      let delta = ord - todayOrdinal;
      if (delta < 0) delta += 12 * 31;
      return { ...r, delta };
    });
    enriched.sort((a, b) => a.delta - b.delta);
    return enriched.slice(0, count);
  } catch (err) {
    console.error('[bday-storage] listUpcoming:', err);
    return [];
  }
}

/** Liste toutes les configs activées (pour le scheduler). */
function listEnabledConfigs() {
  try {
    return db.prepare(
      'SELECT * FROM bday_config WHERE enabled = 1 AND announcement_channel IS NOT NULL'
    ).all();
  } catch (err) {
    console.error('[bday-storage] listEnabledConfigs:', err);
    return [];
  }
}

function isAlreadyAnnounced(guildId, userId, dateStr) {
  try {
    return !!db.prepare(
      'SELECT 1 FROM bday_announced WHERE guild_id = ? AND user_id = ? AND announced_date = ?'
    ).get(guildId, userId, dateStr);
  } catch { return false; }
}

function markAnnounced(guildId, userId, dateStr) {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO bday_announced (guild_id, user_id, announced_date)
      VALUES (?, ?, ?)
    `).run(guildId, userId, dateStr);
    return true;
  } catch (err) {
    console.error('[bday-storage] markAnnounced:', err);
    return false;
  }
}

module.exports = {
  getConfig,
  setConfig,
  setBirthday,
  removeBirthday,
  getBirthday,
  listTodaysBirthdays,
  listUpcoming,
  listEnabledConfigs,
  isAlreadyAnnounced,
  markAnnounced,
};
