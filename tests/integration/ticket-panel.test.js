'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

describe('Ticket Panel V2 — fichiers', () => {
  test('bot/ui/panels/ticket-panel.js existe', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/panels/ticket-panel.js')));
  });
  test('bot/ui/handlers/ticket-handler.js existe', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/handlers/ticket-handler.js')));
  });
  test('bot/core/ticket-helper.js existe', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'bot/core/ticket-helper.js')));
  });
  test('bot/commands/ticket/ticketconfig.js existe', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'bot/commands/ticket/ticketconfig.js')));
  });
});

describe('Ticket Panel V2 — exports', () => {
  test('renderTicketPanel et renderTicketAdvancedPanel exportés', () => {
    const mod = require(path.join(ROOT, 'bot/ui/panels/ticket-panel.js'));
    assert.equal(typeof mod.renderTicketPanel,         'function');
    assert.equal(typeof mod.renderTicketAdvancedPanel, 'function');
  });

  test('renderTicketPanel retourne objet V2 valide', () => {
    const { renderTicketPanel } = require(path.join(ROOT, 'bot/ui/panels/ticket-panel.js'));
    const panel = renderTicketPanel('test-guild-001');
    assert.ok(Array.isArray(panel.components), 'components doit être un tableau');
    assert.equal(panel.components.length, 1, 'un seul container');
    assert.ok(panel.flags !== undefined, 'flags doit être défini');
    assert.equal(panel.flags, 32768, 'IsComponentsV2 = 32768');
  });

  test('renderTicketAdvancedPanel retourne objet V2 valide', () => {
    const { renderTicketAdvancedPanel } = require(path.join(ROOT, 'bot/ui/panels/ticket-panel.js'));
    const panel = renderTicketAdvancedPanel('test-guild-002');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.components.length, 1);
    assert.equal(panel.flags, 32768);
  });
});

describe('Ticket Helper V2 — exports', () => {
  test('getTicketConfig, updateTicketConfig, resetTicketField exportés', () => {
    const mod = require(path.join(ROOT, 'bot/core/ticket-helper.js'));
    assert.equal(typeof mod.getTicketConfig,    'function');
    assert.equal(typeof mod.updateTicketConfig, 'function');
    assert.equal(typeof mod.resetTicketField,   'function');
  });

  test('getTicketConfig retourne undefined pour une guild inconnue', () => {
    const { getTicketConfig } = require(path.join(ROOT, 'bot/core/ticket-helper.js'));
    const result = getTicketConfig('non-existent-guild-xyz-000');
    assert.equal(result, undefined);
  });

  test('resetTicketField lève une erreur pour un champ inconnu', () => {
    const { resetTicketField } = require(path.join(ROOT, 'bot/core/ticket-helper.js'));
    assert.throws(
      () => resetTicketField('test-guild', 'champ_inexistant'),
      /Champ ticket inconnu/,
    );
  });
});

describe('Ticket Handler V2 — exports', () => {
  test('handleTicketInteraction et register exportés', () => {
    const mod = require(path.join(ROOT, 'bot/ui/handlers/ticket-handler.js'));
    assert.equal(typeof mod.handleTicketInteraction, 'function');
    assert.equal(typeof mod.register,               'function');
  });
});

describe('Ticket commande ticketconfig', () => {
  test('module charge sans erreur', () => {
    assert.doesNotThrow(() => {
      require(path.join(ROOT, 'bot/commands/ticket/ticketconfig.js'));
    });
  });
  test('name = ticketconfig', () => {
    const cmd = require(path.join(ROOT, 'bot/commands/ticket/ticketconfig.js'));
    assert.equal(cmd.name, 'ticketconfig');
  });
  test('aliases ne contient pas ticketconfig (anti-collision)', () => {
    const cmd = require(path.join(ROOT, 'bot/commands/ticket/ticketconfig.js'));
    assert.ok(!cmd.aliases.includes('ticketconfig'));
  });
  test('ticket.js ne contient plus ticketconfig comme alias', () => {
    const cmd = require(path.join(ROOT, 'bot/commands/ticket/ticket.js'));
    assert.ok(!cmd.aliases.includes('ticketconfig'), 'collision alias supprimée');
  });
});
