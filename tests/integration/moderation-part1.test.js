'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('node:path');

// Stubs Discord.js symbols used by the commands
const STUB_PERMS = { has: () => true };
const STUB_BOT   = { permissions: STUB_PERMS, roles: { highest: { position: 999 } }, isCommunicationDisabled: () => false };

// Verify command files are loadable and export the correct shape
const COMMANDS = [
  'addrole', 'removerole', 'derank', 'nickname',
  'clearwarns', 'clearbans', 'clearmutes', 'unmute', 'unwarn', 'find',
];

describe('Modération Part 1 — structure des commandes', () => {
  for (const name of COMMANDS) {
    it(`${name}.js charge sans erreur`, () => {
      const cmd = require(path.join(__dirname, `../../bot/commands/moderation/${name}.js`));
      assert.ok(cmd.name, `${name}: champ name manquant`);
      assert.ok(Array.isArray(cmd.aliases), `${name}: aliases doit être un tableau`);
      assert.ok(typeof cmd.execute === 'function', `${name}: execute doit être une fonction`);
      assert.strictEqual(cmd.guildOnly, true, `${name}: guildOnly doit être true`);
    });
  }

  it('addrole — name et aliases corrects', () => {
    const cmd = require('../../bot/commands/moderation/addrole');
    assert.strictEqual(cmd.name, 'addrole');
    assert.ok(cmd.aliases.includes('ar'));
  });

  it('removerole — aliases incluent rr et rmrole', () => {
    const cmd = require('../../bot/commands/moderation/removerole');
    assert.ok(cmd.aliases.includes('rr'));
    assert.ok(cmd.aliases.includes('rmrole'));
  });

  it('derank — alias dr présent', () => {
    const cmd = require('../../bot/commands/moderation/derank');
    assert.ok(cmd.aliases.includes('dr'));
  });

  it('nickname — aliases incluent nick et rename', () => {
    const cmd = require('../../bot/commands/moderation/nickname');
    assert.ok(cmd.aliases.includes('nick'));
    assert.ok(cmd.aliases.includes('rename'));
  });

  it('unmute — alias um présent', () => {
    const cmd = require('../../bot/commands/moderation/unmute');
    assert.ok(cmd.aliases.includes('um'));
  });

  it('find — alias vfind présent', () => {
    const cmd = require('../../bot/commands/moderation/find');
    assert.ok(cmd.aliases.includes('vfind'));
  });

  it('clearwarns — alias cw présent', () => {
    const cmd = require('../../bot/commands/moderation/clearwarns');
    assert.ok(cmd.aliases.includes('cw'));
  });

  it('clearbans — alias cb présent, permissions inclut BanMembers', () => {
    const cmd = require('../../bot/commands/moderation/clearbans');
    assert.ok(cmd.aliases.includes('cb'));
    assert.ok(cmd.permissions.includes('BanMembers'));
  });

  it('clearmutes — alias cm présent', () => {
    const cmd = require('../../bot/commands/moderation/clearmutes');
    assert.ok(cmd.aliases.includes('cm'));
  });

  it('unwarn — alias uw présent', () => {
    const cmd = require('../../bot/commands/moderation/unwarn');
    assert.ok(cmd.aliases.includes('uw'));
  });
});
