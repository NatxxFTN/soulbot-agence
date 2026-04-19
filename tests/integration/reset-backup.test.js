'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const path   = require('path');

describe('Nuke & Backup — fichiers', () => {
  it('nuke.js existe dans owner/', () => {
    const p = path.join(__dirname, '../../bot/commands/owner/nuke.js');
    assert.ok(fs.existsSync(p), 'nuke.js manquant');
  });

  it('backup.js existe dans owner/', () => {
    const p = path.join(__dirname, '../../bot/commands/owner/backup.js');
    assert.ok(fs.existsSync(p), 'backup.js manquant');
  });
});

describe('Nuke — sécurité exports', () => {
  const reset = require('../../bot/commands/owner/nuke');

  it('ownerOnly est true', () => {
    assert.strictEqual(reset.ownerOnly, true);
  });

  it('guildOnly est true', () => {
    assert.strictEqual(reset.guildOnly, true);
  });

  it('COOLDOWN_MS est 1 heure (3 600 000 ms)', () => {
    assert.strictEqual(reset.COOLDOWN_MS, 3_600_000);
  });

  it('activeResets est une Map', () => {
    assert.ok(reset.activeResets instanceof Map, 'activeResets doit être une Map');
  });

  it('activeResets est vide au démarrage', () => {
    assert.strictEqual(reset.activeResets.size, 0);
  });

  it('name est nuke', () => {
    assert.strictEqual(reset.name, 'nuke');
  });

  it('aliases contient reset et wipe', () => {
    assert.ok(Array.isArray(reset.aliases));
    assert.ok(reset.aliases.includes('reset'));
    assert.ok(reset.aliases.includes('wipe'));
  });
});

describe('Backup — sécurité exports', () => {
  const backup = require('../../bot/commands/owner/backup');

  it('ownerOnly est true', () => {
    assert.strictEqual(backup.ownerOnly, true);
  });

  it('guildOnly est true', () => {
    assert.strictEqual(backup.guildOnly, true);
  });

  it('aliases contient bk', () => {
    assert.ok(Array.isArray(backup.aliases));
    assert.ok(backup.aliases.includes('bk'));
  });
});

describe('DB — tables reset présentes', () => {
  const { db } = require('../../bot/database');

  it('table reset_logs présente', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reset_logs'").get();
    assert.ok(row, 'reset_logs manquante');
  });

  it('table reset_cooldowns présente', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reset_cooldowns'").get();
    assert.ok(row, 'reset_cooldowns manquante');
  });

  it('reset_logs a les colonnes attendues', () => {
    const cols = db.prepare("PRAGMA table_info(reset_logs)").all().map(c => c.name);
    for (const col of ['guild_id', 'user_id', 'auto_backup_name', 'channels_deleted', 'roles_deleted', 'emojis_deleted', 'success', 'timestamp']) {
      assert.ok(cols.includes(col), `colonne manquante : ${col}`);
    }
  });

  it('reset_cooldowns a guild_id et last_reset_at', () => {
    const cols = db.prepare("PRAGMA table_info(reset_cooldowns)").all().map(c => c.name);
    assert.ok(cols.includes('guild_id'));
    assert.ok(cols.includes('last_reset_at'));
  });

  it('index idx_reset_logs_guild présent', () => {
    const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_reset_logs_guild'").get();
    assert.ok(idx, 'index idx_reset_logs_guild manquant');
  });
});
