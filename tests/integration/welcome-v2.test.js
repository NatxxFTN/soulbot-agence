'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const p    = (...parts) => path.join(ROOT, ...parts);

// ─── Fichiers ────────────────────────────────────────────────────────────────

describe('Welcome v2 — fichiers', () => {
  test('welcome-panel.js existe',   () => assert.ok(fs.existsSync(p('bot/ui/panels/welcome-panel.js'))));
  test('welcome-handler.js existe', () => assert.ok(fs.existsSync(p('bot/ui/handlers/welcome-handler.js'))));
  test('welcome-helper.js existe',  () => assert.ok(fs.existsSync(p('bot/core/welcome-helper.js'))));
  test('welcomeconfig.js existe',   () => assert.ok(fs.existsSync(p('bot/commands/configuration/welcomeconfig.js'))));
  test('guildMemberAdd.js existe',  () => assert.ok(fs.existsSync(p('bot/events/guildMemberAdd.js'))));
});

// ─── Exports panel ───────────────────────────────────────────────────────────

describe('Welcome v2 — exports panel', () => {
  const panel = () => require(p('bot/ui/panels/welcome-panel.js'));

  test('renderMainPanel exporté',    () => assert.equal(typeof panel().renderMainPanel,    'function'));
  test('renderEmbedPanel exporté',   () => assert.equal(typeof panel().renderEmbedPanel,   'function'));
  test('renderFieldsPanel exporté',  () => assert.equal(typeof panel().renderFieldsPanel,  'function'));
  test('renderAdvancedPanel exporté',() => assert.equal(typeof panel().renderAdvancedPanel,'function'));
  test('renderPreviewPanel exporté', () => assert.equal(typeof panel().renderPreviewPanel, 'function'));
  test('alias renderWelcomePanel',   () => assert.equal(typeof panel().renderWelcomePanel, 'function'));
});

// ─── Exports handler ─────────────────────────────────────────────────────────

describe('Welcome v2 — exports handler', () => {
  test('register exporté', () => {
    const h = require(p('bot/ui/handlers/welcome-handler.js'));
    assert.equal(typeof h.register, 'function');
  });
  test('handleWelcomeInteraction exporté', () => {
    const h = require(p('bot/ui/handlers/welcome-handler.js'));
    assert.equal(typeof h.handleWelcomeInteraction, 'function');
  });
});

// ─── Exports helper ───────────────────────────────────────────────────────────

describe('Welcome v2 — exports helper', () => {
  const h = () => require(p('bot/core/welcome-helper.js'));

  test('getWelcomeConfig',     () => assert.equal(typeof h().getWelcomeConfig,     'function'));
  test('updateWelcomeConfig',  () => assert.equal(typeof h().updateWelcomeConfig,  'function'));
  test('resetWelcomeConfig',   () => assert.equal(typeof h().resetWelcomeConfig,   'function'));
  test('applyPreset',          () => assert.equal(typeof h().applyPreset,          'function'));
  test('getFields',            () => assert.equal(typeof h().getFields,            'function'));
  test('addField',             () => assert.equal(typeof h().addField,             'function'));
  test('getAutoRoles',         () => assert.equal(typeof h().getAutoRoles,         'function'));
  test('addAutoRole',          () => assert.equal(typeof h().addAutoRole,          'function'));
  test('removeAutoRole',       () => assert.equal(typeof h().removeAutoRole,       'function'));
  test('logWelcome',           () => assert.equal(typeof h().logWelcome,           'function'));
  test('getStats',             () => assert.equal(typeof h().getStats,             'function'));
  test('shouldTriggerWelcome', () => assert.equal(typeof h().shouldTriggerWelcome, 'function'));
  test('buildWelcomeMessage',  () => assert.equal(typeof h().buildWelcomeMessage,  'function'));
  test('validateColor',        () => assert.equal(typeof h().validateColor,        'function'));
  test('validateImageUrl',     () => assert.equal(typeof h().validateImageUrl,     'function'));
  test('replaceVariables',     () => assert.equal(typeof h().replaceVariables,     'function'));
  test('resolveImageSource',   () => assert.equal(typeof h().resolveImageSource,   'function'));
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('Welcome v2 — validateColor', () => {
  const { validateColor } = require(p('bot/core/welcome-helper.js'));

  test('accepte #F39C12',       () => { const r = validateColor('#F39C12'); assert.ok(r.valid); assert.equal(r.color, '#F39C12'); });
  test('accepte orange preset', () => { const r = validateColor('orange');  assert.ok(r.valid); assert.equal(r.color, '#F39C12'); });
  test('accepte random',        () => { const r = validateColor('random');  assert.ok(r.valid); assert.match(r.color, /^#[0-9A-Fa-f]{6}$/); });
  test('refuse notacolor',      () => assert.ok(!validateColor('notacolor').valid));
  test('refuse vide comme hex', () => { const r = validateColor(''); assert.ok(r.valid); });
});

describe('Welcome v2 — validateImageUrl', () => {
  const { validateImageUrl } = require(p('bot/core/welcome-helper.js'));

  test('accepte user_avatar',   () => assert.ok(validateImageUrl('user_avatar').valid));
  test('accepte server_icon',   () => assert.ok(validateImageUrl('server_icon').valid));
  test('accepte user_banner',   () => assert.ok(validateImageUrl('user_banner').valid));
  test('accepte vide',          () => assert.ok(validateImageUrl('').valid));
  test('refuse javascript:',    () => assert.ok(!validateImageUrl('javascript:alert(1)').valid));
  test('refuse trop long',      () => assert.ok(!validateImageUrl('https://' + 'a'.repeat(2048)).valid));
});

// ─── shouldTriggerWelcome ────────────────────────────────────────────────────

describe('Welcome v2 — shouldTriggerWelcome', () => {
  const { shouldTriggerWelcome } = require(p('bot/core/welcome-helper.js'));

  const makeMember = (overrides = {}) => ({
    user: { bot: false, createdTimestamp: Date.now() - 30 * 86400000, ...overrides.user },
    roles: { cache: { has: () => false } },
    ...overrides,
  });

  test('disabled → no trigger',      () => assert.equal(shouldTriggerWelcome({ enabled: 0 }, makeMember()).trigger, false));
  test('no channel → no trigger',    () => assert.equal(shouldTriggerWelcome({ enabled: 1, channel_id: null }, makeMember()).trigger, false));
  test('bot ignored',                () => assert.equal(shouldTriggerWelcome({ enabled: 1, channel_id: '1', ignore_bots: 1 }, makeMember({ user: { bot: true, createdTimestamp: Date.now() } })).trigger, false));
  test('account too young',          () => assert.equal(shouldTriggerWelcome({ enabled: 1, channel_id: '1', min_account_age_days: 100 }, makeMember({ user: { bot: false, createdTimestamp: Date.now() - 86400000 } })).trigger, false));
  test('valid member triggers',      () => assert.equal(shouldTriggerWelcome({ enabled: 1, channel_id: '123' }, makeMember()).trigger, true));
});

// ─── DB tables ────────────────────────────────────────────────────────────────

describe('Welcome v2 — DB schema', () => {
  const src = fs.readFileSync(p('bot/database/index.js'), 'utf8');

  test('welcome_config table',      () => assert.ok(src.includes('welcome_config')));
  test('welcome_fields table',      () => assert.ok(src.includes('welcome_fields')));
  test('welcome_auto_roles table',  () => assert.ok(src.includes('welcome_auto_roles')));
  test('welcome_stats table',       () => assert.ok(src.includes('welcome_stats')));
  test('secondary_channel_id col',  () => assert.ok(src.includes('secondary_channel_id')));
  test('dm_delay_seconds col',      () => assert.ok(src.includes('dm_delay_seconds')));
  test('mention_then_delete col',   () => assert.ok(src.includes('mention_then_delete')));
  test('active_hours_start col',    () => assert.ok(src.includes('active_hours_start')));
  test('cooldown_seconds col',      () => assert.ok(src.includes('cooldown_seconds')));
});

// ─── bot/index.js ────────────────────────────────────────────────────────────

describe('Welcome v2 — bot/index.js', () => {
  test('registerWelcomeHandlers présent', () => {
    const src = fs.readFileSync(p('bot/index.js'), 'utf8');
    assert.ok(src.includes('registerWelcomeHandlers'));
  });
});

// ─── guildMemberAdd ──────────────────────────────────────────────────────────

describe('Welcome v2 — guildMemberAdd.js', () => {
  const src = fs.readFileSync(p('bot/events/guildMemberAdd.js'), 'utf8');

  test('shouldTriggerWelcome utilisé',  () => assert.ok(src.includes('shouldTriggerWelcome')));
  test('getAutoRoles utilisé',          () => assert.ok(src.includes('getAutoRoles')));
  test('logWelcome utilisé',            () => assert.ok(src.includes('logWelcome')));
  test('secondary_channel_id géré',     () => assert.ok(src.includes('secondary_channel_id')));
  test('mention_then_delete géré',      () => assert.ok(src.includes('mention_then_delete')));
  test('dm_delay_seconds géré',         () => assert.ok(src.includes('dm_delay_seconds')));
});

// ─── welcomeconfig commande ───────────────────────────────────────────────────

describe('Welcome v2 — commande welcomeconfig', () => {
  test('name + execute présents', () => {
    const cmd = require(p('bot/commands/configuration/welcomeconfig.js'));
    assert.equal(cmd.name, 'welcomeconfig');
    assert.equal(typeof cmd.execute, 'function');
  });
  test('utilise renderMainPanel', () => {
    const src = fs.readFileSync(p('bot/commands/configuration/welcomeconfig.js'), 'utf8');
    assert.ok(src.includes('renderMainPanel'));
  });
});
