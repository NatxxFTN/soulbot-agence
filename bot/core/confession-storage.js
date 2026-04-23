'use strict';

const { db } = require('../database');

// ── Tables ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS confession_config (
    guild_id         TEXT    PRIMARY KEY,
    channel_id       TEXT,
    require_approval INTEGER NOT NULL DEFAULT 1,
    allow_votes      INTEGER NOT NULL DEFAULT 1,
    allow_replies    INTEGER NOT NULL DEFAULT 0,
    ban_words        TEXT    NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS confessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id      TEXT    NOT NULL,
    user_id       TEXT    NOT NULL,
    content       TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'pending',
    message_id    TEXT,
    upvotes       INTEGER NOT NULL DEFAULT 0,
    downvotes     INTEGER NOT NULL DEFAULT 0,
    submitted_at  INTEGER NOT NULL,
    resolved_at   INTEGER
  );

  CREATE TABLE IF NOT EXISTS confession_votes (
    confession_id INTEGER NOT NULL,
    user_id       TEXT    NOT NULL,
    vote          INTEGER NOT NULL,
    voted_at      INTEGER NOT NULL,
    PRIMARY KEY (confession_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_conf_guild   ON confessions(guild_id);
  CREATE INDEX IF NOT EXISTS idx_conf_status  ON confessions(guild_id, status);
  CREATE INDEX IF NOT EXISTS idx_conf_msg     ON confessions(message_id);
`);

function getConfig(guildId) {
  try {
    return db.prepare('SELECT * FROM confession_config WHERE guild_id = ?').get(guildId) || null;
  } catch (err) {
    console.error('[confession-storage] getConfig:', err);
    return null;
  }
}

function setConfig(guildId, patch) {
  try {
    const cur = getConfig(guildId) || {
      guild_id: guildId,
      channel_id: null,
      require_approval: 1,
      allow_votes: 1,
      allow_replies: 0,
      ban_words: '[]',
    };
    const merged = { ...cur, ...patch, guild_id: guildId };
    db.prepare(`
      INSERT INTO confession_config (
        guild_id, channel_id, require_approval, allow_votes, allow_replies, ban_words
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id       = excluded.channel_id,
        require_approval = excluded.require_approval,
        allow_votes      = excluded.allow_votes,
        allow_replies    = excluded.allow_replies,
        ban_words        = excluded.ban_words
    `).run(
      guildId,
      merged.channel_id,
      merged.require_approval ? 1 : 0,
      merged.allow_votes ? 1 : 0,
      merged.allow_replies ? 1 : 0,
      merged.ban_words || '[]',
    );
    return true;
  } catch (err) {
    console.error('[confession-storage] setConfig:', err);
    return false;
  }
}

function createConfession(data) {
  try {
    const res = db.prepare(`
      INSERT INTO confessions (guild_id, user_id, content, status, message_id, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.guild_id,
      data.user_id,
      data.content,
      data.status || 'pending',
      data.message_id || null,
      Date.now(),
    );
    return res.lastInsertRowid;
  } catch (err) {
    console.error('[confession-storage] createConfession:', err);
    return null;
  }
}

function updateConfession(id, patch) {
  try {
    const allowed = ['status', 'message_id', 'upvotes', 'downvotes', 'resolved_at'];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (key in patch) { fields.push(`${key} = ?`); values.push(patch[key]); }
    }
    if (!fields.length) return false;
    values.push(id);
    db.prepare(`UPDATE confessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return true;
  } catch (err) {
    console.error('[confession-storage] updateConfession:', err);
    return false;
  }
}

function getConfession(id) {
  try {
    return db.prepare('SELECT * FROM confessions WHERE id = ?').get(id) || null;
  } catch (err) {
    console.error('[confession-storage] getConfession:', err);
    return null;
  }
}

function listPending(guildId) {
  try {
    return db.prepare(`
      SELECT * FROM confessions
      WHERE guild_id = ? AND status = 'pending'
      ORDER BY submitted_at ASC
    `).all(guildId);
  } catch (err) {
    console.error('[confession-storage] listPending:', err);
    return [];
  }
}

function approveConfession(id, messageId) {
  try {
    db.prepare(`
      UPDATE confessions
      SET status = 'approved', message_id = COALESCE(?, message_id), resolved_at = ?
      WHERE id = ?
    `).run(messageId || null, Date.now(), id);
    return true;
  } catch (err) {
    console.error('[confession-storage] approveConfession:', err);
    return false;
  }
}

function rejectConfession(id) {
  try {
    db.prepare(`
      UPDATE confessions
      SET status = 'rejected', resolved_at = ?
      WHERE id = ?
    `).run(Date.now(), id);
    return true;
  } catch (err) {
    console.error('[confession-storage] rejectConfession:', err);
    return false;
  }
}

/**
 * Enregistre / bascule / annule un vote.
 * direction: 'up' | 'down'
 * Retourne { upvotes, downvotes } après recalcul.
 */
function voteConfession(confessionId, userId, direction) {
  try {
    const voteVal = direction === 'up' ? 1 : -1;
    const existing = db.prepare(
      'SELECT vote FROM confession_votes WHERE confession_id = ? AND user_id = ?'
    ).get(confessionId, userId);

    const tx = db.transaction(() => {
      if (existing && existing.vote === voteVal) {
        db.prepare('DELETE FROM confession_votes WHERE confession_id = ? AND user_id = ?')
          .run(confessionId, userId);
      } else {
        db.prepare(`
          INSERT INTO confession_votes (confession_id, user_id, vote, voted_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(confession_id, user_id) DO UPDATE SET
            vote = excluded.vote,
            voted_at = excluded.voted_at
        `).run(confessionId, userId, voteVal, Date.now());
      }
      const up = db.prepare(
        'SELECT COUNT(*) AS n FROM confession_votes WHERE confession_id = ? AND vote = 1'
      ).get(confessionId)?.n ?? 0;
      const down = db.prepare(
        'SELECT COUNT(*) AS n FROM confession_votes WHERE confession_id = ? AND vote = -1'
      ).get(confessionId)?.n ?? 0;
      db.prepare('UPDATE confessions SET upvotes = ?, downvotes = ? WHERE id = ?')
        .run(up, down, confessionId);
      return { upvotes: up, downvotes: down };
    });
    return tx();
  } catch (err) {
    console.error('[confession-storage] voteConfession:', err);
    return { upvotes: 0, downvotes: 0 };
  }
}

function countConfessions(guildId) {
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM confessions WHERE guild_id = ?').get(guildId);
    return row?.n || 0;
  } catch (err) {
    console.error('[confession-storage] countConfessions:', err);
    return 0;
  }
}

function parseBanWords(raw) {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.map(w => String(w).toLowerCase().trim()).filter(Boolean) : [];
  } catch { return []; }
}

module.exports = {
  getConfig,
  setConfig,
  createConfession,
  updateConfession,
  getConfession,
  listPending,
  approveConfession,
  rejectConfession,
  voteConfession,
  countConfessions,
  parseBanWords,
};
