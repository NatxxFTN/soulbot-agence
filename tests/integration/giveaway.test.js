'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('node:path');

const COMMANDS = ['gcreate', 'giveaway', 'gend', 'gparticipants', 'reroll'];

describe('Giveaway — 5 commandes', () => {
  for (const name of COMMANDS) {
    it(`${name}.js charge sans erreur`, () => {
      const cmd = require(path.join(__dirname, `../../bot/commands/giveaway/${name}.js`));
      assert.ok(cmd.name,                          `${name}: champ name manquant`);
      assert.ok(Array.isArray(cmd.aliases),        `${name}: aliases doit être un tableau`);
      assert.ok(typeof cmd.execute === 'function', `${name}: execute doit être une fonction`);
      assert.strictEqual(cmd.guildOnly, true,      `${name}: guildOnly doit être true`);
    });
  }

  it('gcreate — alias gc présent', () => {
    const cmd = require('../../bot/commands/giveaway/gcreate');
    assert.ok(cmd.aliases.includes('gc'));
  });

  it('gend — alias gstop présent', () => {
    const cmd = require('../../bot/commands/giveaway/gend');
    assert.ok(cmd.aliases.includes('gstop'));
  });

  it('reroll — alias greroll présent (pas rr, déjà pris)', () => {
    const cmd = require('../../bot/commands/giveaway/reroll');
    assert.ok(cmd.aliases.includes('greroll'));
    assert.ok(!cmd.aliases.includes('rr'), 'rr est réservé à removerole');
  });

  it('giveaway-helper — parseDuration correct', () => {
    const { parseDuration } = require('../../bot/core/giveaway-helper');
    assert.strictEqual(parseDuration('1h'),       3_600_000);
    assert.strictEqual(parseDuration('30m'),      1_800_000);
    assert.strictEqual(parseDuration('7d'),  7 * 86_400_000);
    assert.strictEqual(parseDuration('45s'),         45_000);
    assert.strictEqual(parseDuration('invalid'),       null);
    assert.strictEqual(parseDuration(undefined),       null);
  });

  it('giveaway-helper — formatDuration lisible', () => {
    const { formatDuration } = require('../../bot/core/giveaway-helper');
    assert.ok(formatDuration(3_600_000).includes('1h'));
    assert.ok(formatDuration(86_400_000).includes('1j'));
    assert.ok(formatDuration(1_800_000).includes('30m'));
    assert.ok(formatDuration(-1) === 'terminé');
  });

  it('tables giveaway présentes dans la DB', () => {
    const { db } = require('../../bot/database');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'giveaway%'").all();
    const names  = tables.map(t => t.name);
    assert.ok(names.includes('giveaways'),             'giveaways manquant');
    assert.ok(names.includes('giveaway_participants'), 'giveaway_participants manquant');
  });

  it('giveaway-helper — createGiveaway + getGiveaway round-trip', () => {
    const { createGiveaway, getGiveaway } = require('../../bot/core/giveaway-helper');
    const id = createGiveaway({
      guildId: 'test-guild', channelId: 'test-ch', messageId: `test-msg-${Date.now()}`,
      prize: 'Test', winnersCount: 1, endsAt: Date.now() + 60_000, createdBy: 'test-user',
    });
    assert.ok(id > 0);
    const gw = getGiveaway(id);
    assert.strictEqual(gw.prize, 'Test');
    assert.strictEqual(gw.ended, 0);
  });

  it('giveaway-helper — drawWinners sans participants → []', () => {
    const { createGiveaway, drawWinners } = require('../../bot/core/giveaway-helper');
    const id = createGiveaway({
      guildId: 'test-guild', channelId: 'test-ch', messageId: `test-msg-empty-${Date.now()}`,
      prize: 'Vide', winnersCount: 1, endsAt: Date.now() + 60_000, createdBy: 'test-user',
    });
    assert.deepStrictEqual(drawWinners(id, 1), []);
  });
});
