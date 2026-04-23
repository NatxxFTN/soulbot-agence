'use strict';

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS suggestion_config (
    guild_id             TEXT PRIMARY KEY,
    channel_id           TEXT,
    approved_channel_id  TEXT,
    staff_role_id        TEXT,
    anonymous_allowed    INTEGER NOT NULL DEFAULT 0,
    require_approval     INTEGER NOT NULL DEFAULT 0,
    cooldown_seconds     INTEGER NOT NULL DEFAULT 300
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id       TEXT    NOT NULL,
    user_id        TEXT    NOT NULL,
    content        TEXT    NOT NULL,
    message_id     TEXT,
    status         TEXT    NOT NULL DEFAULT 'pending',
    status_reason  TEXT,
    upvotes        INTEGER NOT NULL DEFAULT 0,
    downvotes      INTEGER NOT NULL DEFAULT 0,
    anonymous      INTEGER NOT NULL DEFAULT 0,
    submitted_at   INTEGER NOT NULL,
    resolved_at    INTEGER,
    resolved_by    TEXT
  );

  CREATE TABLE IF NOT EXISTS suggestion_votes (
    suggestion_id  INTEGER NOT NULL,
    user_id        TEXT    NOT NULL,
    vote           INTEGER NOT NULL,
    voted_at       INTEGER NOT NULL,
    PRIMARY KEY (suggestion_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_sugg_guild   ON suggestions(guild_id);
  CREATE INDEX IF NOT EXISTS idx_sugg_user    ON suggestions(guild_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_sugg_msg     ON suggestions(message_id);
  CREATE INDEX IF NOT EXISTS idx_sugg_status  ON suggestions(guild_id, status);
`);

function getConfig(guildId) {
  try {
    return db.prepare('SELECT * FROM suggestion_config WHERE guild_id = ?').get(guildId) || null;
  } catch (err) {
    console.error('[suggestion-storage] getConfig:', err);
    return null;
  }
}

function setConfig(guildId, patch) {
  try {
    const cur = getConfig(guildId) || {
      guild_id: guildId,
      channel_id: null,
      approved_channel_id: null,
      staff_role_id: null,
      anonymous_allowed: 0,
      require_approval: 0,
      cooldown_seconds: 300,
    };
    const merged = { ...cur, ...patch, guild_id: guildId };
    db.prepare(`
      INSERT INTO suggestion_config (
        guild_id, channel_id, approved_channel_id, staff_role_id,
        anonymous_allowed, require_approval, cooldown_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id          = excluded.channel_id,
        approved_channel_id = excluded.approved_channel_id,
        staff_role_id       = excluded.staff_role_id,
        anonymous_allowed   = excluded.anonymous_allowed,
        require_approval    = excluded.require_approval,
        cooldown_seconds    = excluded.cooldown_seconds
    `).run(
      guildId,
      merged.channel_id,
      merged.approved_channel_id,
      merged.staff_role_id,
      merged.anonymous_allowed ? 1 : 0,
      merged.require_approval ? 1 : 0,
      parseInt(merged.cooldown_seconds, 10) || 300,
    );
    return true;
  } catch (err) {
    console.error('[suggestion-storage] setConfig:', err);
    return false;
  }
}

function createSuggestion(data) {
  try {
    const res = db.prepare(`
      INSERT INTO suggestions (guild_id, user_id, content, message_id, anonymous, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.guild_id, data.user_id, data.content,
      data.message_id || null,
      data.anonymous ? 1 : 0,
      Date.now(),
    );
    return res.lastInsertRowid;
  } catch (err) {
    console.error('[suggestion-storage] createSuggestion:', err);
    return null;
  }
}

function updateMessageId(suggestionId, messageId) {
  try {
    db.prepare('UPDATE suggestions SET message_id = ? WHERE id = ?').run(messageId, suggestionId);
  } catch (err) {
    console.error('[suggestion-storage] updateMessageId:', err);
  }
}

function getSuggestion(id) {
  try {
    return db.prepare('SELECT * FROM suggestions WHERE id = ?').get(id) || null;
  } catch (err) {
    console.error('[suggestion-storage] getSuggestion:', err);
    return null;
  }
}

function getSuggestionByMessage(messageId) {
  try {
    return db.prepare('SELECT * FROM suggestions WHERE message_id = ?').get(messageId) || null;
  } catch (err) {
    console.error('[suggestion-storage] getSuggestionByMessage:', err);
    return null;
  }
}

function getLastSubmission(guildId, userId) {
  try {
    return db.prepare(`
      SELECT submitted_at FROM suggestions
      WHERE guild_id = ? AND user_id = ?
      ORDER BY submitted_at DESC LIMIT 1
    `).get(guildId, userId) || null;
  } catch (err) {
    console.error('[suggestion-storage] getLastSubmission:', err);
    return null;
  }
}

function setStatus(id, status, reason, resolvedBy) {
  try {
    db.prepare(`
      UPDATE suggestions
      SET status = ?, status_reason = ?, resolved_at = ?, resolved_by = ?
      WHERE id = ?
    `).run(status, reason || null, Date.now(), resolvedBy || null, id);
    return true;
  } catch (err) {
    console.error('[suggestion-storage] setStatus:', err);
    return false;
  }
}

function getUserVote(suggestionId, userId) {
  try {
    return db.prepare('SELECT vote FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?')
      .get(suggestionId, userId) || null;
  } catch (err) {
    console.error('[suggestion-storage] getUserVote:', err);
    return null;
  }
}

/**
 * Enregistre un vote et recalcule les compteurs sur la suggestion.
 * vote = 1 (up) ou -1 (down). Si le user revote pareil → annule. Si revote inverse → switch.
 * Retourne { upvotes, downvotes }.
 */
function castVote(suggestionId, userId, vote) {
  try {
    const existing = getUserVote(suggestionId, userId);
    const tx = db.transaction(() => {
      if (existing && existing.vote === vote) {
        db.prepare('DELETE FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?')
          .run(suggestionId, userId);
      } else {
        db.prepare(`
          INSERT INTO suggestion_votes (suggestion_id, user_id, vote, voted_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(suggestion_id, user_id) DO UPDATE SET
            vote = excluded.vote,
            voted_at = excluded.voted_at
        `).run(suggestionId, userId, vote, Date.now());
      }

      const up = db.prepare('SELECT COUNT(*) AS n FROM suggestion_votes WHERE suggestion_id = ? AND vote = 1').get(suggestionId)?.n ?? 0;
      const down = db.prepare('SELECT COUNT(*) AS n FROM suggestion_votes WHERE suggestion_id = ? AND vote = -1').get(suggestionId)?.n ?? 0;

      db.prepare('UPDATE suggestions SET upvotes = ?, downvotes = ? WHERE id = ?')
        .run(up, down, suggestionId);

      return { upvotes: up, downvotes: down };
    });
    return tx();
  } catch (err) {
    console.error('[suggestion-storage] castVote:', err);
    return { upvotes: 0, downvotes: 0 };
  }
}

function listTop(guildId, limit = 10) {
  try {
    return db.prepare(`
      SELECT * FROM suggestions
      WHERE guild_id = ?
      ORDER BY upvotes DESC, submitted_at DESC
      LIMIT ?
    `).all(guildId, limit);
  } catch (err) {
    console.error('[suggestion-storage] listTop:', err);
    return [];
  }
}

module.exports = {
  getConfig,
  setConfig,
  createSuggestion,
  updateMessageId,
  getSuggestion,
  getSuggestionByMessage,
  getLastSubmission,
  setStatus,
  getUserVote,
  castVote,
  listTop,
};
