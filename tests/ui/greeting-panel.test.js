'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

describe('Système UI Panels — Greeting pilote', () => {

  it('theme.js existe et exporte COLORS/EMOJIS/LABELS', () => {
    const theme = require('../../bot/ui/theme');
    assert.ok(theme.COLORS,          'COLORS manquant');
    assert.ok(theme.EMOJIS,          'EMOJIS manquant');
    assert.ok(theme.LABELS,          'LABELS manquant');
    assert.equal(theme.COLORS.accent, 0xF39C12, 'accent ≠ #F39C12');
  });

  it('panel-builder existe et exporte buildPanel', () => {
    const p = path.join(__dirname, '../../bot/ui/builders/panel-builder.js');
    assert.ok(fs.existsSync(p), 'panel-builder.js introuvable');
    const { buildPanel } = require('../../bot/ui/builders/panel-builder');
    assert.equal(typeof buildPanel, 'function');
  });

  it('toggle-section exporte buildToggleButton + buildSectionText', () => {
    const mod = require('../../bot/ui/builders/toggle-section');
    assert.equal(typeof mod.buildToggleButton, 'function');
    assert.equal(typeof mod.buildSectionText,  'function');
  });

  it('components buttons exporte reset/configure/back/save/cancel', () => {
    const btns = require('../../bot/ui/components/buttons');
    assert.equal(typeof btns.reset,     'function');
    assert.equal(typeof btns.configure, 'function');
    assert.equal(typeof btns.back,      'function');
    assert.equal(typeof btns.save,      'function');
    assert.equal(typeof btns.cancel,    'function');
  });

  it('components selects exporte channel/role/string', () => {
    const sels = require('../../bot/ui/components/selects');
    assert.equal(typeof sels.channel, 'function');
    assert.equal(typeof sels.role,    'function');
    assert.equal(typeof sels.string,  'function');
  });

  it('components modals exporte buildModal', () => {
    const { buildModal } = require('../../bot/ui/components/modals');
    assert.equal(typeof buildModal, 'function');
  });

  it('greeting-panel exporte renderMainPanel/renderJoinPanel/renderLeavePanel', () => {
    const panel = require('../../bot/ui/panels/greeting-panel');
    assert.equal(typeof panel.renderMainPanel,  'function');
    assert.equal(typeof panel.renderJoinPanel,  'function');
    assert.equal(typeof panel.renderLeavePanel, 'function');
  });

  it('greeting-handler exporte handleGreetingInteraction + register', () => {
    const handler = require('../../bot/ui/handlers/greeting-handler');
    assert.equal(typeof handler.handleGreetingInteraction, 'function');
    assert.equal(typeof handler.register,                  'function');
  });

  it('buildPanel retourne { embeds: [EmbedBuilder], components: [] }', () => {
    const { buildPanel } = require('../../bot/ui/builders/panel-builder');
    const { COLORS } = require('../../bot/ui/theme');
    const result = buildPanel({ title: 'Test', description: 'Desc', color: COLORS.accent });
    assert.equal(result.embeds.length, 1);
    assert.ok(Array.isArray(result.components));
  });

  it('greeting.js refactorisé — utilise renderMainPanel', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../bot/commands/greeting/greeting.js'), 'utf8'
    );
    assert.ok(src.includes('renderMainPanel'), 'renderMainPanel absent dans greeting.js');
    assert.ok(!src.includes('E.base()'),       'Ancien embed E.base() encore présent');
  });

  it('index.js enregistre les UI handlers', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../bot/index.js'), 'utf8'
    );
    assert.ok(src.includes('registerUIHandlers'), 'registerUIHandlers non appelé dans index.js');
  });

});
