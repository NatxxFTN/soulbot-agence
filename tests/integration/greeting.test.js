'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('node:path');

const COMMANDS = ['greeting', 'joiner', 'leaver', 'setwelcome', 'testgreet'];

describe('Greeting — 5 commandes', () => {
  for (const name of COMMANDS) {
    it(`${name}.js charge sans erreur`, () => {
      const cmd = require(path.join(__dirname, `../../bot/commands/greeting/${name}.js`));
      assert.ok(cmd.name,                          `${name}: champ name manquant`);
      assert.ok(Array.isArray(cmd.aliases),        `${name}: aliases doit être un tableau`);
      assert.ok(typeof cmd.execute === 'function', `${name}: execute doit être une fonction`);
      assert.strictEqual(cmd.guildOnly, true,      `${name}: guildOnly doit être true`);
    });
  }

  it('joiner — alias welcome présent', () => {
    const cmd = require('../../bot/commands/greeting/joiner');
    assert.ok(cmd.aliases.includes('welcome'));
  });

  it('leaver — alias goodbye présent', () => {
    const cmd = require('../../bot/commands/greeting/leaver');
    assert.ok(cmd.aliases.includes('goodbye'));
  });

  it('setwelcome — alias setjoin présent', () => {
    const cmd = require('../../bot/commands/greeting/setwelcome');
    assert.ok(cmd.aliases.includes('setjoin'));
  });

  it('greeting-helper — formatMessage remplace toutes les variables', () => {
    const { formatMessage } = require('../../bot/core/greeting-helper');
    const fakeMember = {
      id  : '123456789',
      user: { username: 'Nathan' },
      guild: { name: 'TestServer', memberCount: 42 },
    };
    const result = formatMessage('Bienvenue {user} ({username}) sur {server} — {count} membres', fakeMember);
    assert.ok(result.includes('<@123456789>'),  '{user} non remplacé');
    assert.ok(result.includes('Nathan'),        '{username} non remplacé');
    assert.ok(result.includes('TestServer'),    '{server} non remplacé');
    assert.ok(result.includes('42'),            '{count} non remplacé');
  });

  it('greeting-helper — formatMessage chaîne vide → chaîne vide', () => {
    const { formatMessage } = require('../../bot/core/greeting-helper');
    const fakeMember = { id: '1', user: { username: 'x' }, guild: { name: 'y', memberCount: 1 } };
    assert.strictEqual(formatMessage('', fakeMember), '');
  });

  it('table greeting_config présente dans la DB', () => {
    const { db } = require('../../bot/database');
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='greeting_config'").get();
    assert.ok(row, 'table greeting_config manquante');
  });

  it('greeting-helper — updateConfig + getConfig round-trip', () => {
    const { updateConfig, getConfig } = require('../../bot/core/greeting-helper');
    const guildId = 'test-greeting-guild';
    updateConfig(guildId, { join_channel_id: 'ch-001', join_enabled: 1 });
    const cfg = getConfig(guildId);
    assert.strictEqual(cfg.join_channel_id, 'ch-001');
    assert.strictEqual(cfg.join_enabled, 1);
  });
});
