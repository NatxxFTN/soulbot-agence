'use strict';

/* ═══════════════════════════════════════════════
   TEST BOTCONFIG STUDIO V5 — offline, zéro appel Discord.
   Couvre : validateurs SecOps, draft → apply atomique, audit
   trail, historique FIFO, presets (limite/doublon), pricing V5,
   thème par guild (résolution + invalidation).
   Usage : node scripts/test-botconfig-v5.js
   ═══════════════════════════════════════════════ */

process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs');

// DB jetable : on copie le module database sur un fichier temporaire ?
// Non — le module pointe data/bot.db. Les tests écrivent sur une guild
// fictive G_TEST puis nettoient TOUT à la fin (delete by guild_id).
const TEST_GUILD = 'TEST_BOTCONFIG_V5_GUILD';
const TEST_USER  = 'TEST_USER_1';

let passed = 0;
let failed = 0;

function check(label, cond) {
  if (cond) { passed++; console.log(`  [✓] ${label}`); }
  else      { failed++; console.log(`  [✗] ${label}`); }
}

// ─── 1. Validateurs SecOps ────────────────────────────────────────────────────
console.log('\n── Validateurs SecOps ──');
const V = require('../bot/utils/config-validators');

check('hex valide #B600A8', V.validateHexColor('#B600A8').ok && V.validateHexColor('#B600A8').value === 'B600A8');
check('hex valide sans #', V.validateHexColor('ff0000').value === 'FF0000');
check('hex rejeté (court)', !V.validateHexColor('#FFF').ok);
check('hex rejeté (texte)', !V.validateHexColor('rouge').ok);
check('url https png ok', V.validateImageUrl('https://cdn.discordapp.com/x.png').ok);
check('url http rejetée', !V.validateImageUrl('http://site.fr/x.png').ok);
check('url javascript: rejetée', !V.validateImageUrl('javascript:alert(1)').ok);
check('url data: rejetée', !V.validateImageUrl('data:image/png;base64,xxx').ok);
check('url .exe rejetée', !V.validateImageUrl('https://site.fr/payload.exe').ok);
check('url vide → null (reset)', V.validateImageUrl('').value === null);
check('url > 2048 rejetée', !V.validateImageUrl('https://a.fr/' + 'a'.repeat(2050) + '.png').ok);
check('nickname 32 max', !V.validateNickname('x'.repeat(33)).ok);
check('nickname vide → null', V.validateNickname('').value === null);
check('embed_style rich ok', V.validateEmbedStyle('rich').ok);
check('embed_style inconnu rejeté', !V.validateEmbedStyle('fancy').ok);
check('emoji mention → id', V.validateBrandEmoji('<:soul:123456789012345678>').value === '123456789012345678');
check('emoji animé → id', V.validateBrandEmoji('<a:soul:123456789012345678>').value === '123456789012345678');
check('emoji unicode rejeté', !V.validateBrandEmoji('🔥').ok);
check('prefix espace rejeté', !V.validatePrefix('a b').ok);
check('preset name 50 max', !V.validatePresetName('x'.repeat(51)).ok);

// ─── 2. DB : draft apply atomique + audit + FIFO ─────────────────────────────
console.log('\n── Draft apply atomique + audit trail + FIFO ──');
const { db } = require('../bot/database');
const GC = require('../bot/core/guild-config');

// Nettoyage préalable au cas où un run précédent a crashé.
function cleanup() {
  db.prepare('DELETE FROM guild_bot_config WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare('DELETE FROM bot_config_log WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare('DELETE FROM bot_assets_history WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare('DELETE FROM bot_presets WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare("DELETE FROM bot_pricing WHERE id LIKE 'test_v5_%'").run();
}
cleanup();

const changed1 = GC.applyIdentityDraft(TEST_GUILD, {
  nickname: 'SoulTest', embed_color: 'FF0000', embed_style: 'compact',
}, TEST_USER);
check('apply 3 champs → 3 changed', changed1.length === 3);

const cfg1 = GC.getGuildBotConfig(TEST_GUILD);
check('nickname persisté', cfg1.nickname === 'SoulTest');
check('embed_color persisté', cfg1.embed_color === 'FF0000');
check('embed_style persisté', cfg1.embed_style === 'compact');

const log1 = GC.getConfigLog(TEST_GUILD);
check('audit trail : 3 entrées', log1.length === 3);
check('audit old_value null (1er set)', log1.every((l) => l.field !== 'nickname' || l.old_value === null));

// 2e apply : la couleur change → l'ancienne part en historique.
const changed2 = GC.applyIdentityDraft(TEST_GUILD, { embed_color: '00FF00', nickname: 'SoulTest' }, TEST_USER);
check('apply idempotent : nickname identique non re-modifié', changed2.length === 1 && changed2[0] === 'embed_color');
check('ancienne couleur en historique', GC.getAssetHistory(TEST_GUILD, 'color').some((a) => a.value === 'FF0000'));

// FIFO 20 : on pousse 25 couleurs → il n'en reste que 20.
for (let i = 0; i < 25; i++) GC.pushAssetHistory(TEST_GUILD, 'color', `C0L0R${String(i).padStart(2, '0')}`);
check('rotation FIFO max 20', GC.getAssetHistory(TEST_GUILD, 'color', 50).length === 20);

// ─── 3. Presets ───────────────────────────────────────────────────────────────
console.log('\n── Presets ──');
const payload = { identity: { embed_color: 'FF0000' }, prefix: '!', pricing: [] };
const s1 = GC.savePreset(TEST_GUILD, 'Test Rouge', payload);
check('savePreset ok', s1.ok === true);
check('doublon refusé', GC.savePreset(TEST_GUILD, 'Test Rouge', payload).reason === 'duplicate');

const loaded = GC.getPreset(TEST_GUILD, s1.id);
check('getPreset payload parsé', loaded.payload.identity.embed_color === 'FF0000');

const dup = GC.duplicatePreset(TEST_GUILD, s1.id);
check('duplication ok (suffixe copie)', dup.ok === true);
check('rename ok', GC.renamePreset(TEST_GUILD, dup.id, 'Test Renommé') === true);
check('setActive un seul actif', (() => {
  GC.setActivePreset(TEST_GUILD, s1.id);
  GC.setActivePreset(TEST_GUILD, dup.id);
  const actives = GC.listPresets(TEST_GUILD).filter((p) => p.is_active);
  return actives.length === 1 && actives[0].id === dup.id;
})());

// Limite 10.
for (let i = 0; i < 12; i++) GC.savePreset(TEST_GUILD, `Bulk ${i}`, payload);
check('limite 10 presets', GC.listPresets(TEST_GUILD).length === 10);
check('savePreset refuse au-delà', GC.savePreset(TEST_GUILD, 'Onzième', payload).reason === 'limit');
check('deletePreset ok', GC.deletePreset(TEST_GUILD, s1.id) === true);

// ─── 4. Pricing V5 ────────────────────────────────────────────────────────────
console.log('\n── Pricing V5 ──');
const pricing = require('../bot/core/pricing');

const t1 = pricing.addPricing('Test V5 Ultra', 49.99, 'Tier de test', TEST_USER);
check('addPricing ok + slug', t1.ok && t1.id === 'test_v5_ultra');
check('doublon refusé', pricing.addPricing('Test V5 Ultra', 9.99, null, TEST_USER).reason === 'duplicate');
check('nouveau tier en fin de liste', (() => {
  const all = pricing.getAllPricing();
  return all[all.length - 1].id === 'test_v5_ultra';
})());
check('setPricingOrder', pricing.setPricingOrder('test_v5_ultra', 0, TEST_USER) === true);
pricing.invalidatePricingCache();
// Égalité d'ordre (fixed est aussi à 0) → départage par prix croissant :
// le tier de test doit passer DEVANT tier_basic (order 1) mais derrière fixed.
check('tri par display_order', (() => {
  const ids = pricing.getAllPricing().map((t) => t.id);
  return ids.indexOf('test_v5_ultra') < ids.indexOf('tier_basic');
})());
check('setPricingDefault', pricing.setPricingDefault('test_v5_ultra', true, TEST_USER) === true);
check('deactivatePricing (soft)', (() => {
  pricing.deactivatePricing('test_v5_ultra', TEST_USER);
  pricing.invalidatePricingCache();
  return !pricing.getAllPricing().some((t) => t.id === 'test_v5_ultra')
    && pricing.getPricingById('test_v5_ultra') !== null; // toujours en DB
})());

// ─── 5. Thème par guild (response-builder) ───────────────────────────────────
console.log('\n── Thème par guild ──');
const RB = require('../bot/utils/response-builder');

RB.invalidateTheme(TEST_GUILD);
const theme1 = RB.getTheme(TEST_GUILD);
check('thème lit la DB (00FF00)', theme1.primary === 0x00FF00);
check('style compact hérité', theme1.embedStyle === 'compact');
check('thème par défaut sans guild', RB.getTheme(null).primary === 0xB600A8);

// Cache : un write direct DB sans invalidation ne doit PAS être visible…
GC.applyIdentityDraft(TEST_GUILD, { embed_color: '0000FF' }, TEST_USER);
check('cache 60s : ancienne valeur servie', RB.getTheme(TEST_GUILD).primary === 0x00FF00);
// …et l'invalidation le rafraîchit immédiatement.
RB.invalidateTheme(TEST_GUILD);
check('invalidateTheme → nouvelle valeur', RB.getTheme(TEST_GUILD).primary === 0x0000FF);

const T = RB.themed(TEST_GUILD);
check('themed().primaryEmbed couleur héritée', T.primaryEmbed('Titre', 'Desc').data.color === 0x0000FF);
check('themed minimal sans footer', (() => {
  RB.invalidateTheme(TEST_GUILD);
  GC.applyIdentityDraft(TEST_GUILD, { embed_style: 'minimal' }, TEST_USER);
  RB.invalidateTheme(TEST_GUILD);
  const embed = RB.themed(TEST_GUILD).primaryEmbed('X', 'Y');
  return embed.data.footer === undefined;
})());

// ─── Nettoyage final + bilan ──────────────────────────────────────────────────
cleanup();
RB.invalidateTheme();

console.log(`\n═══ Bilan : ${passed} passés, ${failed} échoués ═══`);
process.exit(failed > 0 ? 1 : 0);
