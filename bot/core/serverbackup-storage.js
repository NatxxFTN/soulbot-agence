'use strict';

const { db } = require('../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS serverbackup_config (
    guild_id         TEXT PRIMARY KEY,
    enabled          INTEGER NOT NULL DEFAULT 0,
    interval_days    INTEGER NOT NULL DEFAULT 7,
    max_backups      INTEGER NOT NULL DEFAULT 5,
    include_members  INTEGER NOT NULL DEFAULT 0,
    notify_channel   TEXT,
    last_backup_at   INTEGER
  );

  CREATE TABLE IF NOT EXISTS serverbackup_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT    NOT NULL,
    name            TEXT    NOT NULL,
    snapshot_data   BLOB,
    size_bytes      INTEGER NOT NULL DEFAULT 0,
    members_count   INTEGER NOT NULL DEFAULT 0,
    channels_count  INTEGER NOT NULL DEFAULT 0,
    roles_count     INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    auto            INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_sback_guild  ON serverbackup_snapshots(guild_id);
  CREATE INDEX IF NOT EXISTS idx_sback_date   ON serverbackup_snapshots(guild_id, created_at DESC);
`);

function getConfig(guildId) {
  try {
    return db.prepare('SELECT * FROM serverbackup_config WHERE guild_id = ?').get(guildId) || null;
  } catch (err) {
    console.error('[serverbackup-storage] getConfig:', err);
    return null;
  }
}

function setConfig(guildId, patch) {
  try {
    const cur = getConfig(guildId) || {
      guild_id: guildId,
      enabled: 0,
      interval_days: 7,
      max_backups: 5,
      include_members: 0,
      notify_channel: null,
      last_backup_at: null,
    };
    const merged = { ...cur, ...patch, guild_id: guildId };
    db.prepare(`
      INSERT INTO serverbackup_config (
        guild_id, enabled, interval_days, max_backups, include_members, notify_channel, last_backup_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        enabled         = excluded.enabled,
        interval_days   = excluded.interval_days,
        max_backups     = excluded.max_backups,
        include_members = excluded.include_members,
        notify_channel  = excluded.notify_channel,
        last_backup_at  = excluded.last_backup_at
    `).run(
      guildId,
      merged.enabled ? 1 : 0,
      parseInt(merged.interval_days, 10) || 7,
      parseInt(merged.max_backups, 10) || 5,
      merged.include_members ? 1 : 0,
      merged.notify_channel || null,
      merged.last_backup_at || null,
    );
    return true;
  } catch (err) {
    console.error('[serverbackup-storage] setConfig:', err);
    return false;
  }
}

function getAllEnabledConfigs() {
  try {
    return db.prepare('SELECT * FROM serverbackup_config WHERE enabled = 1').all();
  } catch (err) {
    console.error('[serverbackup-storage] getAllEnabledConfigs:', err);
    return [];
  }
}

function updateLastBackup(guildId, ts) {
  try {
    db.prepare('UPDATE serverbackup_config SET last_backup_at = ? WHERE guild_id = ?').run(ts, guildId);
  } catch (err) {
    console.error('[serverbackup-storage] updateLastBackup:', err);
  }
}

function createSnapshot(obj) {
  try {
    const res = db.prepare(`
      INSERT INTO serverbackup_snapshots (
        guild_id, name, snapshot_data, size_bytes,
        members_count, channels_count, roles_count,
        created_at, auto
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      obj.guild_id,
      obj.name,
      obj.snapshot_data || null,
      obj.size_bytes || 0,
      obj.members_count || 0,
      obj.channels_count || 0,
      obj.roles_count || 0,
      obj.created_at || Date.now(),
      obj.auto ? 1 : 0,
    );
    return res.lastInsertRowid;
  } catch (err) {
    console.error('[serverbackup-storage] createSnapshot:', err);
    return null;
  }
}

function listSnapshots(guildId) {
  try {
    return db.prepare(`
      SELECT id, guild_id, name, size_bytes, members_count, channels_count, roles_count, created_at, auto
      FROM serverbackup_snapshots
      WHERE guild_id = ?
      ORDER BY created_at DESC
    `).all(guildId);
  } catch (err) {
    console.error('[serverbackup-storage] listSnapshots:', err);
    return [];
  }
}

function deleteSnapshot(id) {
  try {
    const res = db.prepare('DELETE FROM serverbackup_snapshots WHERE id = ?').run(id);
    return res.changes > 0;
  } catch (err) {
    console.error('[serverbackup-storage] deleteSnapshot:', err);
    return false;
  }
}

function getSnapshot(id) {
  try {
    return db.prepare('SELECT * FROM serverbackup_snapshots WHERE id = ?').get(id) || null;
  } catch (err) {
    console.error('[serverbackup-storage] getSnapshot:', err);
    return null;
  }
}

function pruneOldSnapshots(guildId, maxKeep) {
  try {
    const all = listSnapshots(guildId);
    if (all.length <= maxKeep) return 0;
    const toDelete = all.slice(maxKeep);
    let removed = 0;
    for (const s of toDelete) {
      if (deleteSnapshot(s.id)) removed++;
    }
    return removed;
  } catch (err) {
    console.error('[serverbackup-storage] pruneOldSnapshots:', err);
    return 0;
  }
}

module.exports = {
  getConfig,
  setConfig,
  getAllEnabledConfigs,
  updateLastBackup,
  createSnapshot,
  listSnapshots,
  deleteSnapshot,
  getSnapshot,
  pruneOldSnapshots,
};
