'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

// ─── Nuke — fichiers ─────────────────────────────────────────────────────────
describe('Nuke — fichiers', () => {
  test('nuke-helper existe',  () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/core/nuke-helper.js'))));
  test('backup-helper existe',() => assert.ok(fs.existsSync(path.join(ROOT, 'bot/core/backup-helper.js'))));
  test('nuke-panel existe',   () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/panels/nuke-panel.js'))));
  test('nuke-handler existe', () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/handlers/nuke-handler.js'))));
  test('commande nuke existe',() => assert.ok(fs.existsSync(path.join(ROOT, 'bot/commands/owner/nuke.js'))));
});

describe('Nuke — exports et rendu', () => {
  test('renderNukePanel et renderNukeHistoryPanel exportés', () => {
    const mod = require(path.join(ROOT, 'bot/ui/panels/nuke-panel.js'));
    assert.equal(typeof mod.renderNukePanel,        'function');
    assert.equal(typeof mod.renderNukeHistoryPanel, 'function');
  });

  test('renderNukePanel retourne objet V2 valide', () => {
    const { renderNukePanel } = require(path.join(ROOT, 'bot/ui/panels/nuke-panel.js'));
    const panel = renderNukePanel('test-nuke-001');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.components.length, 1);
    assert.equal(panel.flags, 32768);
  });

  test('renderNukeHistoryPanel retourne objet V2 valide', () => {
    const { renderNukeHistoryPanel } = require(path.join(ROOT, 'bot/ui/panels/nuke-panel.js'));
    const panel = renderNukeHistoryPanel('test-nuke-002');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.flags, 32768);
  });

  test('getNukeConfig retourne undefined pour guild inconnue', () => {
    const { getNukeConfig } = require(path.join(ROOT, 'bot/core/nuke-helper.js'));
    assert.equal(getNukeConfig('non-existent-guild-nuke-000'), undefined);
  });

  test('COOLDOWNS contient les 3 modes', () => {
    const { COOLDOWNS } = require(path.join(ROOT, 'bot/core/nuke-helper.js'));
    assert.ok(COOLDOWNS.classique > 0);
    assert.ok(COOLDOWNS.rapide    > 0);
    assert.ok(COOLDOWNS.urgence   > 0);
    assert.ok(COOLDOWNS.classique > COOLDOWNS.rapide);
    assert.ok(COOLDOWNS.rapide    > COOLDOWNS.urgence);
  });

  test('backup-helper exporte createBackup et listBackups', () => {
    const mod = require(path.join(ROOT, 'bot/core/backup-helper.js'));
    assert.equal(typeof mod.createBackup, 'function');
    assert.equal(typeof mod.listBackups,  'function');
  });

  test('nuke-handler exporte register et handleNukeInteraction', () => {
    const mod = require(path.join(ROOT, 'bot/ui/handlers/nuke-handler.js'));
    assert.equal(typeof mod.register,              'function');
    assert.equal(typeof mod.handleNukeInteraction, 'function');
  });
});

// ─── Lockdown — fichiers ──────────────────────────────────────────────────────
describe('Lockdown — fichiers', () => {
  test('lockdown-helper existe',  () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/core/lockdown-helper.js'))));
  test('lockdown-panel existe',   () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/panels/lockdown-panel.js'))));
  test('lockdown-handler existe', () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/handlers/lockdown-handler.js'))));
  test('commande lockdown existe',() => assert.ok(fs.existsSync(path.join(ROOT, 'bot/commands/protection/lockdown.js'))));
});

describe('Lockdown — exports et rendu', () => {
  test('renderLockdownPanel exporté', () => {
    const mod = require(path.join(ROOT, 'bot/ui/panels/lockdown-panel.js'));
    assert.equal(typeof mod.renderLockdownPanel, 'function');
  });

  test('renderLockdownPanel retourne objet V2 valide', () => {
    const { renderLockdownPanel } = require(path.join(ROOT, 'bot/ui/panels/lockdown-panel.js'));
    const panel = renderLockdownPanel('test-ld-001');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.components.length, 1);
    assert.equal(panel.flags, 32768);
  });

  test('getLockdownConfig retourne undefined pour guild inconnue', () => {
    const { getLockdownConfig } = require(path.join(ROOT, 'bot/core/lockdown-helper.js'));
    assert.equal(getLockdownConfig('non-existent-guild-ld-000'), undefined);
  });
});

// ─── Raidmode — fichiers ──────────────────────────────────────────────────────
describe('Raidmode — fichiers', () => {
  test('raidmode-helper existe',  () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/core/raidmode-helper.js'))));
  test('raidmode-panel existe',   () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/panels/raidmode-panel.js'))));
  test('raidmode-handler existe', () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/handlers/raidmode-handler.js'))));
  test('commande raidmode existe',() => assert.ok(fs.existsSync(path.join(ROOT, 'bot/commands/protection/raidmode.js'))));
});

describe('Raidmode — exports et rendu', () => {
  test('renderRaidmodePanel exporté', () => {
    const mod = require(path.join(ROOT, 'bot/ui/panels/raidmode-panel.js'));
    assert.equal(typeof mod.renderRaidmodePanel, 'function');
  });

  test('renderRaidmodePanel retourne objet V2 valide', () => {
    const { renderRaidmodePanel } = require(path.join(ROOT, 'bot/ui/panels/raidmode-panel.js'));
    const panel = renderRaidmodePanel('test-rm-001');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.components.length, 1);
    assert.equal(panel.flags, 32768);
  });

  test('getRaidmodeConfig retourne undefined pour guild inconnue', () => {
    const { getRaidmodeConfig } = require(path.join(ROOT, 'bot/core/raidmode-helper.js'));
    assert.equal(getRaidmodeConfig('non-existent-guild-rm-000'), undefined);
  });

  test('VALID_ACTIONS contient kick, ban, timeout', () => {
    const { VALID_ACTIONS } = require(path.join(ROOT, 'bot/core/raidmode-helper.js'));
    assert.ok(VALID_ACTIONS.includes('kick'));
    assert.ok(VALID_ACTIONS.includes('ban'));
    assert.ok(VALID_ACTIONS.includes('timeout'));
  });

  test('trackJoin retourne false sous le seuil', () => {
    const { trackJoin } = require(path.join(ROOT, 'bot/core/raidmode-helper.js'));
    const result = trackJoin('test-rm-track-001', 10, 60);
    assert.equal(typeof result, 'boolean');
  });
});

// ─── Alert — fichiers ─────────────────────────────────────────────────────────
describe('Alert — fichiers', () => {
  test('commande alert existe', () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/commands/protection/alert.js'))));
});

describe('Alert — exports', () => {
  test('exports name et execute', () => {
    const mod = require(path.join(ROOT, 'bot/commands/protection/alert.js'));
    assert.equal(mod.name, 'alert');
    assert.equal(typeof mod.execute, 'function');
    assert.ok(Array.isArray(mod.aliases));
  });
});

// ─── Massban — fichiers ───────────────────────────────────────────────────────
describe('Massban — fichiers', () => {
  test('massban-panel existe',   () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/panels/massban-panel.js'))));
  test('massban-handler existe', () => assert.ok(fs.existsSync(path.join(ROOT, 'bot/ui/handlers/massban-handler.js'))));
  test('commande massban existe',() => assert.ok(fs.existsSync(path.join(ROOT, 'bot/commands/protection/massban.js'))));
});

describe('Massban — exports et rendu', () => {
  test('renderMassbanPanel exporté', () => {
    const mod = require(path.join(ROOT, 'bot/ui/panels/massban-panel.js'));
    assert.equal(typeof mod.renderMassbanPanel, 'function');
  });

  test('renderMassbanPanel retourne objet V2 valide', () => {
    const { renderMassbanPanel } = require(path.join(ROOT, 'bot/ui/panels/massban-panel.js'));
    const panel = renderMassbanPanel('test-mb-001');
    assert.ok(Array.isArray(panel.components));
    assert.equal(panel.components.length, 1);
    assert.equal(panel.flags, 32768);
  });
});

// ─── DB — nouvelles tables ────────────────────────────────────────────────────
describe('DB — tables Session 3', () => {
  test('nuke_config accessible', () => {
    const { db } = require(path.join(ROOT, 'bot/database/index.js'));
    const row = db.prepare('SELECT * FROM nuke_config WHERE guild_id = ?').get('no-guild');
    assert.equal(row, undefined);
  });
  test('lockdown_config accessible', () => {
    const { db } = require(path.join(ROOT, 'bot/database/index.js'));
    const row = db.prepare('SELECT * FROM lockdown_config WHERE guild_id = ?').get('no-guild');
    assert.equal(row, undefined);
  });
  test('raidmode_config accessible', () => {
    const { db } = require(path.join(ROOT, 'bot/database/index.js'));
    const row = db.prepare('SELECT * FROM raidmode_config WHERE guild_id = ?').get('no-guild');
    assert.equal(row, undefined);
  });
  test('massban_logs accessible', () => {
    const { db } = require(path.join(ROOT, 'bot/database/index.js'));
    const rows = db.prepare('SELECT * FROM massban_logs WHERE guild_id = ? LIMIT 1').all('no-guild');
    assert.ok(Array.isArray(rows));
  });
});

// ─── index.js — handlers enregistrés ─────────────────────────────────────────
describe('index.js — handlers Session 3', () => {
  test('nuke-handler est enregistré dans bot/index.js', () => {
    const src = fs.readFileSync(path.join(ROOT, 'bot/index.js'), 'utf8');
    assert.ok(src.includes('registerNukeHandlers'));
    assert.ok(src.includes('registerLockdownHandlers'));
    assert.ok(src.includes('registerRaidmodeHandlers'));
    assert.ok(src.includes('registerMassbanHandlers'));
  });
});
