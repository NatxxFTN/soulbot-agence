'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('node:path');

const COMMANDS = [
  'ticket', 'quickticket', 'ticketload',
  'add', 'remove', 'claim',
  'close', 'closeall',
  'delete', 'deleteall',
  'rename', 'reopen',
];

describe('Ticket — 12 commandes', () => {
  for (const name of COMMANDS) {
    it(`${name}.js charge sans erreur`, () => {
      const cmd = require(path.join(__dirname, `../../bot/commands/ticket/${name}.js`));
      assert.ok(cmd.name,                          `${name}: champ name manquant`);
      assert.ok(Array.isArray(cmd.aliases),        `${name}: aliases doit être un tableau`);
      assert.ok(typeof cmd.execute === 'function', `${name}: execute doit être une fonction`);
      assert.strictEqual(cmd.guildOnly, true,      `${name}: guildOnly doit être true`);
    });
  }

  it('ticket — aliases corrects', () => {
    const cmd = require('../../bot/commands/ticket/ticket');
    assert.ok(cmd.aliases.includes('tconfig'));
  });

  it('quickticket — aliases corrects', () => {
    const cmd = require('../../bot/commands/ticket/quickticket');
    assert.ok(cmd.aliases.includes('qticket'));
    assert.ok(cmd.aliases.includes('qt'));
  });

  it('add — alias tadd présent', () => {
    const cmd = require('../../bot/commands/ticket/add');
    assert.ok(cmd.aliases.includes('tadd'));
  });

  it('close — alias cl présent', () => {
    const cmd = require('../../bot/commands/ticket/close');
    assert.ok(cmd.aliases.includes('cl'));
  });

  it('reopen — alias rouvrir présent', () => {
    const cmd = require('../../bot/commands/ticket/reopen');
    assert.ok(cmd.aliases.includes('rouvrir'));
  });

  it('ticket-helper charge sans erreur et exporte les fonctions', () => {
    const h = require('../../bot/core/ticket-helper');
    assert.ok(typeof h.createTicket    === 'function');
    assert.ok(typeof h.closeTicket     === 'function');
    assert.ok(typeof h.reopenTicket    === 'function');
    assert.ok(typeof h.getConfig       === 'function');
    assert.ok(typeof h.setConfig       === 'function');
    assert.ok(typeof h.getTicketByChannel === 'function');
    assert.ok(typeof h.markDeleted     === 'function');
    assert.ok(typeof h.logAction       === 'function');
  });

  it('tables ticket présentes dans la DB', () => {
    const { db } = require('../../bot/database');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ticket%'").all();
    const names  = tables.map(t => t.name);
    assert.ok(names.includes('ticket_config'),      'ticket_config manquant');
    assert.ok(names.includes('tickets'),            'tickets manquant');
    assert.ok(names.includes('ticket_participants'),'ticket_participants manquant');
  });
});
