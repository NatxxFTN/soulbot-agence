'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const p    = (...parts) => path.join(ROOT, ...parts);

describe('Session 5 — Welcomer fichiers', () => {
  test('welcome-panel.js existe',   () => assert.ok(fs.existsSync(p('bot/ui/panels/welcome-panel.js'))));
  test('welcome-handler.js existe', () => assert.ok(fs.existsSync(p('bot/ui/handlers/welcome-handler.js'))));
  test('welcome-helper.js existe',  () => assert.ok(fs.existsSync(p('bot/core/welcome-helper.js'))));
  test('welcomeconfig.js existe',   () => assert.ok(fs.existsSync(p('bot/commands/configuration/welcomeconfig.js'))));
  test('guildMemberAdd.js existe',  () => assert.ok(fs.existsSync(p('bot/events/guildMemberAdd.js'))));
});

describe('Session 5 — Welcomer exports', () => {
  test('helper exporte getWelcomeConfig', () => {
    const h = require(p('bot/core/welcome-helper.js'));
    assert.equal(typeof h.getWelcomeConfig, 'function');
  });
  test('helper exporte validateImageUrl', () => {
    const h = require(p('bot/core/welcome-helper.js'));
    assert.equal(typeof h.validateImageUrl, 'function');
  });
  test('helper exporte validateColor', () => {
    const h = require(p('bot/core/welcome-helper.js'));
    assert.equal(typeof h.validateColor, 'function');
  });
  test('helper exporte replaceVariables', () => {
    const h = require(p('bot/core/welcome-helper.js'));
    assert.equal(typeof h.replaceVariables, 'function');
  });
  test('helper exporte buildWelcomeMessage', () => {
    const h = require(p('bot/core/welcome-helper.js'));
    assert.equal(typeof h.buildWelcomeMessage, 'function');
  });
  test('handler exporte register', () => {
    const h = require(p('bot/ui/handlers/welcome-handler.js'));
    assert.equal(typeof h.register, 'function');
  });
  test('commande welcomeconfig a name + execute', () => {
    const cmd = require(p('bot/commands/configuration/welcomeconfig.js'));
    assert.equal(cmd.name, 'welcomeconfig');
    assert.equal(typeof cmd.execute, 'function');
  });
});

describe('Session 5 — Welcomer validation', () => {
  test('validateColor accepte #F39C12', () => {
    const { validateColor } = require(p('bot/core/welcome-helper.js'));
    const r = validateColor('#F39C12');
    assert.ok(r.valid);
    assert.equal(r.color, '#F39C12');
  });
  test('validateColor refuse "notacolor"', () => {
    const { validateColor } = require(p('bot/core/welcome-helper.js'));
    assert.ok(!validateColor('notacolor').valid);
  });
  test('validateImageUrl accepte user_avatar', () => {
    const { validateImageUrl } = require(p('bot/core/welcome-helper.js'));
    assert.ok(validateImageUrl('user_avatar').valid);
  });
  test('validateImageUrl refuse javascript:', () => {
    const { validateImageUrl } = require(p('bot/core/welcome-helper.js'));
    assert.ok(!validateImageUrl('javascript:alert(1)').valid);
  });
});

describe('Session 5 — DB tables', () => {
  test('welcome_config dans le schéma', () => {
    const src = fs.readFileSync(p('bot/database/index.js'), 'utf8');
    assert.ok(src.includes('welcome_config'));
  });
  test('welcome_fields dans le schéma', () => {
    const src = fs.readFileSync(p('bot/database/index.js'), 'utf8');
    assert.ok(src.includes('welcome_fields'));
  });
});

describe('Session 5 — bot/index.js', () => {
  test('registerWelcomeHandlers présent', () => {
    const src = fs.readFileSync(p('bot/index.js'), 'utf8');
    assert.ok(src.includes('registerWelcomeHandlers'));
  });
});
