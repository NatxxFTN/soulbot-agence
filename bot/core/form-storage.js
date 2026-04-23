'use strict';

// ── Form Storage — SQLite ────────────────────────────────────────────────────
// Tables : forms + form_submissions — scope par guild
// Questions stockées JSON, answers JSON

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS forms (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id           TEXT    NOT NULL,
    name               TEXT    NOT NULL,
    title              TEXT    NOT NULL,
    description        TEXT,
    questions          TEXT    NOT NULL DEFAULT '[]',
    log_channel_id     TEXT,
    message_channel_id TEXT,
    message_id         TEXT,
    button_label       TEXT    NOT NULL DEFAULT 'Remplir le formulaire',
    button_emoji       TEXT,
    button_style       TEXT    NOT NULL DEFAULT 'Primary',
    anonymous          INTEGER NOT NULL DEFAULT 0,
    one_per_user       INTEGER NOT NULL DEFAULT 0,
    closed             INTEGER NOT NULL DEFAULT 0,
    created_by         TEXT    NOT NULL,
    created_at         INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS form_submissions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id       INTEGER NOT NULL,
    user_id       TEXT    NOT NULL,
    answers       TEXT    NOT NULL DEFAULT '{}',
    submitted_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_forms_guild         ON forms(guild_id);
  CREATE INDEX IF NOT EXISTS idx_forms_message       ON forms(message_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_form    ON form_submissions(form_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_user    ON form_submissions(form_id, user_id);
`);

function createForm(data) {
  try {
    const now = Date.now();
    const res = db.prepare(`
      INSERT INTO forms (
        guild_id, name, title, description, questions,
        log_channel_id, message_channel_id, message_id,
        button_label, button_emoji, button_style,
        anonymous, one_per_user, closed, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.guild_id,
      data.name || 'formulaire',
      data.title || 'Formulaire',
      data.description || null,
      JSON.stringify(data.questions || []),
      data.log_channel_id || null,
      data.message_channel_id || null,
      data.message_id || null,
      data.button_label || 'Remplir le formulaire',
      data.button_emoji || null,
      data.button_style || 'Primary',
      data.anonymous ? 1 : 0,
      data.one_per_user ? 1 : 0,
      data.closed ? 1 : 0,
      data.created_by,
      now,
    );
    return res.lastInsertRowid;
  } catch (err) {
    console.error('[form-storage] createForm:', err);
    return null;
  }
}

function updateForm(id, patch) {
  try {
    const form = getForm(id);
    if (!form) return false;
    const merged = { ...form, ...patch };
    db.prepare(`
      UPDATE forms SET
        name = ?, title = ?, description = ?, questions = ?,
        log_channel_id = ?, message_channel_id = ?, message_id = ?,
        button_label = ?, button_emoji = ?, button_style = ?,
        anonymous = ?, one_per_user = ?, closed = ?
      WHERE id = ?
    `).run(
      merged.name,
      merged.title,
      merged.description,
      typeof merged.questions === 'string' ? merged.questions : JSON.stringify(merged.questions || []),
      merged.log_channel_id,
      merged.message_channel_id,
      merged.message_id,
      merged.button_label,
      merged.button_emoji,
      merged.button_style,
      merged.anonymous ? 1 : 0,
      merged.one_per_user ? 1 : 0,
      merged.closed ? 1 : 0,
      id,
    );
    return true;
  } catch (err) {
    console.error('[form-storage] updateForm:', err);
    return false;
  }
}

function _hydrate(row) {
  if (!row) return null;
  let questions = [];
  try { questions = JSON.parse(row.questions || '[]'); } catch { questions = []; }
  return { ...row, questions };
}

function getForm(id) {
  try {
    const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(id);
    return _hydrate(row);
  } catch (err) {
    console.error('[form-storage] getForm:', err);
    return null;
  }
}

function getFormByMessage(messageId) {
  try {
    const row = db.prepare('SELECT * FROM forms WHERE message_id = ?').get(messageId);
    return _hydrate(row);
  } catch (err) {
    console.error('[form-storage] getFormByMessage:', err);
    return null;
  }
}

function listForms(guildId) {
  try {
    const rows = db.prepare('SELECT * FROM forms WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
    return rows.map(_hydrate);
  } catch (err) {
    console.error('[form-storage] listForms:', err);
    return [];
  }
}

function deleteForm(id) {
  try {
    db.prepare('DELETE FROM form_submissions WHERE form_id = ?').run(id);
    const res = db.prepare('DELETE FROM forms WHERE id = ?').run(id);
    return res.changes > 0;
  } catch (err) {
    console.error('[form-storage] deleteForm:', err);
    return false;
  }
}

function recordSubmission(formId, userId, answers) {
  try {
    const res = db.prepare(`
      INSERT INTO form_submissions (form_id, user_id, answers, submitted_at)
      VALUES (?, ?, ?, ?)
    `).run(formId, userId, JSON.stringify(answers || {}), Date.now());
    return res.lastInsertRowid;
  } catch (err) {
    console.error('[form-storage] recordSubmission:', err);
    return null;
  }
}

function listSubmissions(formId, limit = 50) {
  try {
    const rows = db.prepare(`
      SELECT * FROM form_submissions
      WHERE form_id = ?
      ORDER BY submitted_at DESC
      LIMIT ?
    `).all(formId, limit);
    return rows.map(r => {
      let answers = {};
      try { answers = JSON.parse(r.answers || '{}'); } catch {}
      return { ...r, answers };
    });
  } catch (err) {
    console.error('[form-storage] listSubmissions:', err);
    return [];
  }
}

function countSubmissions(formId) {
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM form_submissions WHERE form_id = ?').get(formId);
    return row?.n ?? 0;
  } catch (err) {
    console.error('[form-storage] countSubmissions:', err);
    return 0;
  }
}

function hasUserSubmitted(formId, userId) {
  try {
    const row = db.prepare('SELECT 1 FROM form_submissions WHERE form_id = ? AND user_id = ? LIMIT 1').get(formId, userId);
    return !!row;
  } catch (err) {
    console.error('[form-storage] hasUserSubmitted:', err);
    return false;
  }
}

function closeForm(id) {
  try {
    const res = db.prepare('UPDATE forms SET closed = 1 WHERE id = ?').run(id);
    return res.changes > 0;
  } catch (err) {
    console.error('[form-storage] closeForm:', err);
    return false;
  }
}

module.exports = {
  createForm,
  updateForm,
  getForm,
  getFormByMessage,
  listForms,
  deleteForm,
  recordSubmission,
  listSubmissions,
  countSubmissions,
  hasUserSubmitted,
  closeForm,
};
