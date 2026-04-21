'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const p    = (...parts) => path.join(ROOT, ...parts);

// ─── Help ────────────────────────────────────────────────────────────────────

describe('Session 4 — Help fichiers', () => {
  test('help-helper.js existe',  () => assert.ok(fs.existsSync(p('bot/core/help-helper.js'))));
  test('help-panel.js existe',   () => assert.ok(fs.existsSync(p('bot/ui/panels/help-panel.js'))));
  test('help-handler.js existe', () => assert.ok(fs.existsSync(p('bot/ui/handlers/help-handler.js'))));
  test('commande help.js existe',() => assert.ok(fs.existsSync(p('bot/commands/utility/help.js'))));
});

describe('Session 4 — Help exports', () => {
  test('scanCommands est une fonction', () => {
    const { scanCommands } = require(p('bot/core/help-helper.js'));
    assert.equal(typeof scanCommands, 'function');
  });
  test('findCommand retourne null pour commande inconnue', () => {
    const { findCommand } = require(p('bot/core/help-helper.js'));
    assert.equal(findCommand('__nonexistent__42__'), null);
  });
  test('getCategoryEmoji retourne une string non vide', () => {
    const { getCategoryEmoji } = require(p('bot/core/help-helper.js'));
    assert.equal(typeof getCategoryEmoji('Owner'), 'string');
    assert.ok(getCategoryEmoji('Owner').length > 0);
  });
  test('renderHelpPanel exporte une fonction', () => {
    const { renderHelpPanel } = require(p('bot/ui/panels/help-panel.js'));
    assert.equal(typeof renderHelpPanel, 'function');
  });
  test('renderHelpPanel() home retourne objet V2', () => {
    const { renderHelpPanel } = require(p('bot/ui/panels/help-panel.js'));
    const panel = renderHelpPanel(); // sans arg = accueil Components V2
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.flags, 32768); // MessageFlags.IsComponentsV2
  });
  test('renderHelpPanel(cat) retourne objet V2', () => {
    const { renderHelpPanel } = require(p('bot/ui/panels/help-panel.js'));
    const panel = renderHelpPanel('Moderation', 1); // avec cat = Components V2
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.flags, 32768); // MessageFlags.IsComponentsV2
  });
  test('help handler exporte register', () => {
    const mod = require(p('bot/ui/handlers/help-handler.js'));
    assert.equal(typeof mod.register, 'function');
  });
  test('commande help a name + execute', () => {
    const cmd = require(p('bot/commands/utility/help.js'));
    assert.equal(cmd.name, 'help');
    assert.equal(typeof cmd.execute, 'function');
  });
});

// ─── Modconfig ───────────────────────────────────────────────────────────────

describe('Session 4 — Modconfig fichiers', () => {
  test('mod-helper.js existe',        () => assert.ok(fs.existsSync(p('bot/core/mod-helper.js'))));
  test('modconfig-panel.js existe',   () => assert.ok(fs.existsSync(p('bot/ui/panels/modconfig-panel.js'))));
  test('modconfig-handler.js existe', () => assert.ok(fs.existsSync(p('bot/ui/handlers/modconfig-handler.js'))));
  test('commande modconfig.js existe',() => assert.ok(fs.existsSync(p('bot/commands/moderation/modconfig.js'))));
});

describe('Session 4 — Modconfig exports', () => {
  test('modconfig handler exporte register', () => {
    const mod = require(p('bot/ui/handlers/modconfig-handler.js'));
    assert.equal(typeof mod.register, 'function');
  });
  test('commande modconfig a name + execute', () => {
    const cmd = require(p('bot/commands/moderation/modconfig.js'));
    assert.equal(cmd.name, 'modconfig');
    assert.equal(typeof cmd.execute, 'function');
  });
});

// ─── Warnconfig ──────────────────────────────────────────────────────────────

describe('Session 4 — Warnconfig fichiers', () => {
  test('warn-helper.js existe',        () => assert.ok(fs.existsSync(p('bot/core/warn-helper.js'))));
  test('warnconfig-panel.js existe',   () => assert.ok(fs.existsSync(p('bot/ui/panels/warnconfig-panel.js'))));
  test('warnconfig-handler.js existe', () => assert.ok(fs.existsSync(p('bot/ui/handlers/warnconfig-handler.js'))));
  test('commande warnconfig.js existe',() => assert.ok(fs.existsSync(p('bot/commands/moderation/warnconfig.js'))));
});

describe('Session 4 — Warnconfig exports', () => {
  test('warnconfig handler exporte register', () => {
    const mod = require(p('bot/ui/handlers/warnconfig-handler.js'));
    assert.equal(typeof mod.register, 'function');
  });
  test('commande warnconfig a name + execute', () => {
    const cmd = require(p('bot/commands/moderation/warnconfig.js'));
    assert.equal(cmd.name, 'warnconfig');
    assert.equal(typeof cmd.execute, 'function');
  });
});

// ─── Database ────────────────────────────────────────────────────────────────

describe('Session 4 — Database tables', () => {
  const dbContent = fs.readFileSync(p('bot/database/index.js'), 'utf8');
  test('mod_config dans le schéma',  () => assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS mod_config')));
  test('warn_config dans le schéma', () => assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS warn_config')));
  test('warns dans le schéma',       () => assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS warns')));
});

// ─── bot/index.js registrations ──────────────────────────────────────────────

describe('Session 4 — Handlers enregistrés dans bot/index.js', () => {
  const idx = fs.readFileSync(p('bot/index.js'), 'utf8');
  test('registerHelpHandlers présent',      () => assert.ok(idx.includes('registerHelpHandlers')));
  test('registerModconfigHandlers présent', () => assert.ok(idx.includes('registerModconfigHandlers')));
  test('registerWarnconfigHandlers présent',() => assert.ok(idx.includes('registerWarnconfigHandlers')));
});
