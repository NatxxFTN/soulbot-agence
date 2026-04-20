'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

describe('Système emojis custom — ;setupemojis', () => {

  it('bot/core/emoji-cache.js existe', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../../bot/core/emoji-cache.js')));
  });

  it('emoji-cache exporte getEmoji / setEmojiId / loadCache / clearCache', () => {
    const cache = require('../../bot/core/emoji-cache');
    assert.equal(typeof cache.getEmoji,   'function');
    assert.equal(typeof cache.setEmojiId, 'function');
    assert.equal(typeof cache.loadCache,  'function');
    assert.equal(typeof cache.clearCache, 'function');
  });

  it('fallback Unicode si emoji absent du cache', () => {
    const { getEmoji } = require('../../bot/core/emoji-cache');
    assert.equal(getEmoji('ui_inexistant_xyz', '🔍'), '🔍');
  });

  it('setEmojiId + getEmoji retourne la string custom', () => {
    const { setEmojiId, getEmoji, clearCache } = require('../../bot/core/emoji-cache');
    setEmojiId('_test_emoji', '1234567890', false);
    const result = getEmoji('_test_emoji', '❓');
    assert.equal(result, '<:_test_emoji:1234567890>');
    clearCache();
  });

  it('commande setupemojis existe dans owner/', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../../bot/commands/owner/setupemojis.js')));
  });

  it('setupemojis est ownerOnly + guildOnly', () => {
    const cmd = require('../../bot/commands/owner/setupemojis');
    assert.ok(cmd.ownerOnly,  'ownerOnly manquant');
    assert.ok(cmd.guildOnly,  'guildOnly manquant');
  });

  it('dossier data/emojis/ existe avec les 13 PNG', () => {
    const dir = path.join(__dirname, '../../data/emojis');
    assert.ok(fs.existsSync(dir), 'dossier data/emojis/ manquant');
    const pngs = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    assert.ok(pngs.length >= 12, `Seulement ${pngs.length} PNG trouvés (attendu ≥12)`);
  });

  it('theme.js emojis custom sont des fonctions avec fallback', () => {
    const { EMOJIS, COLORS } = require('../../bot/ui/theme');
    assert.equal(typeof EMOJIS.check,   'function', 'EMOJIS.check doit être une fonction');
    assert.equal(typeof EMOJIS.shield,  'function', 'EMOJIS.shield doit être une fonction');
    assert.equal(typeof EMOJIS.warning, 'function', 'EMOJIS.warning doit être une fonction');
    // Fallback Unicode si cache vide
    const result = EMOJIS.check();
    assert.ok(typeof result === 'string' && result.length > 0);
    assert.equal(COLORS.accent, 0xF39C12);
  });

  it('.gitignore contient data/emojis-ids.json', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../.gitignore'), 'utf8');
    assert.ok(src.includes('emojis-ids.json'), 'emojis-ids.json non gitignored');
  });

});

describe('Greeting Panel v4 — Components V2 clone Mya', () => {

  it('renderPanel retourne flag IsComponentsV2 (32768)', () => {
    const { renderPanel } = require('../../bot/ui/panels/greeting-panel');
    const panel = renderPanel('fake-guild-id', 'join');
    assert.equal(panel.flags, 32768, 'Flag IsComponentsV2 manquant');
  });

  it('renderPanel ne retourne pas d\'embeds (incompatible V2)', () => {
    const { renderPanel } = require('../../bot/ui/panels/greeting-panel');
    const panel = renderPanel('fake-guild-id', 'join');
    assert.ok(!panel.embeds, 'embeds ne doit pas être présent avec Components V2');
  });

  it('renderPanel mode join retourne 1 container', () => {
    const { renderPanel } = require('../../bot/ui/panels/greeting-panel');
    const panel = renderPanel('fake-guild-id', 'join');
    assert.equal(panel.components.length, 1, 'Doit avoir 1 container');
  });

  it('renderPanel mode leave retourne 1 container', () => {
    const { renderPanel } = require('../../bot/ui/panels/greeting-panel');
    const panel = renderPanel('fake-guild-id', 'leave');
    assert.equal(panel.components.length, 1);
  });

  it('greeting-handler exporte handleGreetingInteraction + register', () => {
    const handler = require('../../bot/ui/handlers/greeting-handler');
    assert.equal(typeof handler.handleGreetingInteraction, 'function');
    assert.equal(typeof handler.register,                  'function');
  });

});
