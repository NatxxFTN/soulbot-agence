'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

describe('Dashboard Phase 1 — fondations', () => {
  it('dashboard/server.js existe', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../../dashboard/server.js')));
  });

  it('dashboard/public/logs.html existe', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../../dashboard/public/logs.html')));
  });

  it('bot/core/logger.js existe', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../../bot/core/logger.js')));
  });

  it('bot/database/migrations/bot_logs.sql existe', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../../bot/database/migrations/bot_logs.sql')));
  });

  it('logger exporte log, command, error, modAction, getRecent, getStats', () => {
    const logger = require('../../bot/core/logger');
    assert.equal(typeof logger.log,       'function');
    assert.equal(typeof logger.command,   'function');
    assert.equal(typeof logger.error,     'function');
    assert.equal(typeof logger.modAction, 'function');
    assert.equal(typeof logger.getRecent, 'function');
    assert.equal(typeof logger.getStats,  'function');
  });

  it('table bot_logs existe dans la DB', () => {
    const { db } = require('../../bot/database');
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bot_logs'"
    ).get();
    assert.ok(row, 'Table bot_logs absente — vérifier bot/database/index.js');
  });

  it('logger.log() insère une entrée sans erreur', () => {
    const logger = require('../../bot/core/logger');
    const { db } = require('../../bot/database');
    const countBefore = db.prepare('SELECT COUNT(*) as c FROM bot_logs').get().c;
    logger.log({
      level: 'debug', category: 'system', eventType: 'test_entry',
      message: 'Test dashboard.test.js — entrée synthétique',
    });
    const countAfter = db.prepare('SELECT COUNT(*) as c FROM bot_logs').get().c;
    assert.equal(countAfter, countBefore + 1);
  });

  it('getStats() retourne les 4 métriques attendues', () => {
    const logger = require('../../bot/core/logger');
    const stats = logger.getStats();
    assert.ok('totalCommands' in stats);
    assert.ok('totalErrors'   in stats);
    assert.ok('last24h'       in stats);
    assert.ok('uniqueGuilds'  in stats);
  });

  it('dashboard/server.js importe db correctement (pas getDB)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../dashboard/server.js'), 'utf8'
    );
    assert.ok(!src.includes('getDB()'), 'getDB() encore présent dans server.js');
    assert.ok(src.includes("require('../bot/database')"), 'Import DB manquant');
  });
});
