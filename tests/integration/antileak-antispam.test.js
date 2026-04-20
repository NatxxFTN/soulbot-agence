'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

describe('Antileak — fichiers', () => {
  test('panel existe',   () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/panels/antileak-panel.js'))));
  test('handler existe', () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/handlers/antileak-handler.js'))));
  test('helper existe',  () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/core/antileak-helper.js'))));
  test('commande existe',() => assert.ok(fs.existsSync(path.join(ROOT, 'bot/commands/protection/antileak.js'))));
});

describe('Antileak — exports et rendu', () => {
  test('renderAntileakPanel et renderAntileakWhitelistPanel exportés', () => {
    const mod = require(path.join(ROOT, 'bot/ui/panels/antileak-panel.js'));
    assert.equal(typeof mod.renderAntileakPanel,          'function');
    assert.equal(typeof mod.renderAntileakWhitelistPanel, 'function');
  });

  test('renderAntileakPanel retourne objet V2 valide', () => {
    const { renderAntileakPanel } = require(path.join(ROOT, 'bot/ui/panels/antileak-panel.js'));
    const panel = renderAntileakPanel('test-al-001');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.components.length, 1);
    assert.equal(panel.flags, 32768);
  });

  test('renderAntileakWhitelistPanel retourne objet V2 valide', () => {
    const { renderAntileakWhitelistPanel } = require(path.join(ROOT, 'bot/ui/panels/antileak-panel.js'));
    const panel = renderAntileakWhitelistPanel('test-al-002');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.flags, 32768);
  });

  test('register et handleAntileakInteraction exportés', () => {
    const mod = require(path.join(ROOT, 'bot/ui/handlers/antileak-handler.js'));
    assert.equal(typeof mod.handleAntileakInteraction, 'function');
    assert.equal(typeof mod.register,                  'function');
  });

  test('getAntileakConfig retourne undefined pour guild inconnue', () => {
    const { getAntileakConfig } = require(path.join(ROOT, 'bot/core/antileak-helper.js'));
    assert.equal(getAntileakConfig('non-existent-guild-al-000'), undefined);
  });
});

describe('Antispam — fichiers', () => {
  test('panel existe',   () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/panels/antispam-panel.js'))));
  test('handler existe', () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/handlers/antispam-handler.js'))));
  test('helper existe',  () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/core/antispam-helper.js'))));
  test('commande existe',() => assert.ok(fs.existsSync(path.join(ROOT, 'bot/commands/protection/antispam.js'))));
});

describe('Antispam — exports et rendu', () => {
  test('renderAntispamPanel et renderAntispamWhitelistPanel exportés', () => {
    const mod = require(path.join(ROOT, 'bot/ui/panels/antispam-panel.js'));
    assert.equal(typeof mod.renderAntispamPanel,          'function');
    assert.equal(typeof mod.renderAntispamWhitelistPanel, 'function');
  });

  test('renderAntispamPanel retourne objet V2 valide', () => {
    const { renderAntispamPanel } = require(path.join(ROOT, 'bot/ui/panels/antispam-panel.js'));
    const panel = renderAntispamPanel('test-as-001');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.components.length, 1);
    assert.equal(panel.flags, 32768);
  });

  test('renderAntispamWhitelistPanel retourne objet V2 valide', () => {
    const { renderAntispamWhitelistPanel } = require(path.join(ROOT, 'bot/ui/panels/antispam-panel.js'));
    const panel = renderAntispamWhitelistPanel('test-as-002');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.flags, 32768);
  });

  test('register et handleAntispamInteraction exportés', () => {
    const mod = require(path.join(ROOT, 'bot/ui/handlers/antispam-handler.js'));
    assert.equal(typeof mod.handleAntispamInteraction, 'function');
    assert.equal(typeof mod.register,                  'function');
  });

  test('getAntispamConfig retourne undefined pour guild inconnue', () => {
    const { getAntispamConfig } = require(path.join(ROOT, 'bot/core/antispam-helper.js'));
    assert.equal(getAntispamConfig('non-existent-guild-as-000'), undefined);
  });
});

describe('Scripts safe-restart', () => {
  test('safe-restart.bat existe', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts/safe-restart.bat')));
  });
  test('package.json contient restart:win', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['restart:win'], 'restart:win absent du package.json');
    assert.ok(pkg.scripts['restart'],     'restart absent du package.json');
  });
});
