'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const p    = (...parts) => path.join(ROOT, ...parts);

describe('Rebranding — theme.js', () => {
  test('accent est 0xFF0000', () => {
    const { COLORS } = require(p('bot/ui/theme.js'));
    assert.equal(COLORS.accent, 0xFF0000);
  });
  test('theme.js ne contient plus F39C12', () => {
    const src = fs.readFileSync(p('bot/ui/theme.js'), 'utf8');
    assert.ok(!src.includes('F39C12'), 'F39C12 encore présent dans theme.js');
  });
  test('HEX.accent est #FF0000', () => {
    const { HEX } = require(p('bot/ui/theme.js'));
    assert.equal(HEX.accent, '#FF0000');
  });
});

describe('Rebranding — occurrences F39C12', () => {
  const criticalFiles = [
    'bot/ui/theme.js',
    'bot/utils/embeds.js',
    'bot/ui/handlers/greeting-handler.js',
    'bot/ui/handlers/ticket-handler.js',
  ];
  for (const f of criticalFiles) {
    test(`${f} sans F39C12`, () => {
      const src = fs.readFileSync(p(f), 'utf8');
      assert.ok(!src.includes('F39C12'), `F39C12 encore présent dans ${f}`);
    });
  }
});

describe('Système emojis', () => {
  test('emojis.js existe', () => assert.ok(fs.existsSync(p('bot/core/emojis.js'))));
  test('e() est une fonction', () => {
    const { e } = require(p('bot/core/emojis.js'));
    assert.equal(typeof e, 'function');
  });
  test('forButton() est une fonction', () => {
    const { forButton } = require(p('bot/core/emojis.js'));
    assert.equal(typeof forButton, 'function');
  });
  test('categoryEmoji() est une fonction', () => {
    const { categoryEmoji } = require(p('bot/core/emojis.js'));
    assert.equal(typeof categoryEmoji, 'function');
  });
  test('reload() est une fonction', () => {
    const { reload } = require(p('bot/core/emojis.js'));
    assert.equal(typeof reload, 'function');
  });
  test('e() retourne une string', () => {
    const { e } = require(p('bot/core/emojis.js'));
    assert.equal(typeof e('cat_owner'), 'string');
    assert.ok(e('cat_owner').length > 0);
  });
  test('e() retourne fallback Unicode si pas uploadé', () => {
    const { e } = require(p('bot/core/emojis.js'));
    const result = e('cat_owner');
    assert.ok(typeof result === 'string');
  });
  test('categoryEmoji(Owner) retourne string', () => {
    const { categoryEmoji } = require(p('bot/core/emojis.js'));
    assert.equal(typeof categoryEmoji('Owner'), 'string');
  });
  test('categoryEmoji(Unknown) retourne fallback', () => {
    const { categoryEmoji } = require(p('bot/core/emojis.js'));
    const r = categoryEmoji('UnknownCategoryXYZ');
    assert.ok(typeof r === 'string' && r.length > 0);
  });
  test('FALLBACK_EMOJIS animés présents', () => {
    const { FALLBACK_EMOJIS } = require(p('bot/core/emojis.js'));
    assert.ok(FALLBACK_EMOJIS.ani_world);
    assert.ok(FALLBACK_EMOJIS.ani_coin);
    assert.ok(FALLBACK_EMOJIS.ani_loading);
    assert.ok(FALLBACK_EMOJIS.ani_dice);
  });
  test('FALLBACK_EMOJIS boutons présents', () => {
    const { FALLBACK_EMOJIS } = require(p('bot/core/emojis.js'));
    assert.ok(FALLBACK_EMOJIS.btn_home);
    assert.ok(FALLBACK_EMOJIS.btn_prev);
    assert.ok(FALLBACK_EMOJIS.btn_next);
    assert.ok(FALLBACK_EMOJIS.btn_first);
    assert.ok(FALLBACK_EMOJIS.btn_last);
  });
});

describe('Script upload', () => {
  test('upload-emojis.js existe', () => {
    assert.ok(fs.existsSync(p('bot/scripts/upload-emojis.js')));
  });
  test('emojis:upload dans package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(p('package.json'), 'utf8'));
    assert.ok(pkg.scripts['emojis:upload']);
  });
});

describe('Assets emojis', () => {
  test('Dossier bot/assets/emojis/ existe', () => {
    assert.ok(fs.existsSync(p('bot/assets/emojis')));
  });
  test('Au moins 35 fichiers PNG+GIF', () => {
    const files = fs.readdirSync(p('bot/assets/emojis')).filter(f => f.endsWith('.png') || f.endsWith('.gif'));
    assert.ok(files.length >= 35, `Seulement ${files.length} fichiers (attendu ≥35)`);
  });
  test('Les 4 GIF animés présents', () => {
    const files = fs.readdirSync(p('bot/assets/emojis'));
    const gifs  = files.filter(f => f.endsWith('.gif'));
    assert.ok(gifs.length >= 4, `Seulement ${gifs.length} GIF`);
  });
});
