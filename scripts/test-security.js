'use strict';

// ═══════════════════════════════════════════════
// TEST SÉCURITÉ SOULBOT — v2.1.2
// Tests fonctionnels HORS LIGNE (mocks, zéro appel Discord).
// Lance : node scripts/test-security.js
// Vérifie : détecteurs Forteresse · enforcers antispam/antileak ·
//           roundtrip storage (config, whitelist, blacklist, logs).
// ═══════════════════════════════════════════════

process.env.NODE_ENV = 'test';
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const storage = require('../bot/core/security-storage');

const TEST_GUILD = 'TEST_SECURITY_GUILD';
const results = [];

function mockMessage({ content = '', userMentions = 0, roleMentions = 0, everyone = false, userId = 'U1' } = {}) {
  return {
    guild  : { id: TEST_GUILD },
    author : { id: userId, bot: false },
    member : { roles: { cache: new Map() } },
    channel: { id: 'C1' },
    content,
    mentions: {
      users      : { size: userMentions },
      roles      : { size: roleMentions },
      everyone,
      repliedUser: null,
    },
  };
}

function mockMember({ bot = false, createdDaysAgo = 365, userId = 'M1' } = {}) {
  return {
    guild: { id: TEST_GUILD },
    id   : userId,
    user : {
      id: userId, bot,
      createdTimestamp: Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000,
      username: 'testuser',
    },
    joinedTimestamp: Date.now(),
  };
}

async function test(name, fn) {
  try {
    const passed = await fn();
    results.push({ module: name, passed: !!passed });
  } catch (err) {
    results.push({ module: name, passed: false, error: err.message.slice(0, 60) });
  }
}

(async () => {
  // ═══ 1. DÉTECTEURS FORTERESSE (message) ═══════════════════════════════════
  const d = (n) => require(`../bot/core/security-detectors/${n}`);

  await test('antilink: URL externe → trigger', async () =>
    (await d('antilink').check(mockMessage({ content: 'va voir https://site-arnaque.xyz/free' }), {})).triggered);
  await test('antilink: message sain → pas de trigger', async () =>
    !(await d('antilink').check(mockMessage({ content: 'salut ça va ?' }), {})).triggered);
  await test('antilink: invite Discord ignorée (domaine antiinvite)', async () =>
    !(await d('antilink').check(mockMessage({ content: 'https://discord.gg/abc' }), {})).triggered);

  await test('antiinvite: discord.gg → trigger', async () =>
    (await d('antiinvite').check(mockMessage({ content: 'rejoins discord.gg/abc123' }), {})).triggered);

  await test('antieveryone: @everyone → trigger', async () =>
    (await d('antieveryone').check(mockMessage({ content: 'yo @everyone venez', everyone: true }), {})).triggered);

  await test('antimention: 6 mentions (seuil 5) → trigger', async () =>
    (await d('antimention').check(mockMessage({ userMentions: 6 }), { threshold: 5 })).triggered);
  await test('antimention: 2 mentions → pas de trigger', async () =>
    !(await d('antimention').check(mockMessage({ userMentions: 2 }), { threshold: 5 })).triggered);

  await test('anticaps: message tout en caps → trigger', async () =>
    (await d('anticaps').check(mockMessage({ content: 'ARRETEZ DE CRIER DANS LE SALON GENERAL' }), { threshold: 70 })).triggered);

  await test('antiwords: mot interdit → trigger', async () =>
    (await d('antiwords').check(mockMessage({ content: 'ce mot est interdit ici' }),
      { custom_data: JSON.stringify({ words: ['interdit'] }) })).triggered);

  await test('antiduplicate: 3e message identique → trigger', async () => {
    const det = d('antiduplicate');
    const cfg = { threshold: 3 };
    let anyTrigger = false;
    for (let i = 0; i < 3; i++) {
      const r = await det.check(mockMessage({ content: 'achetez mes nitro gratuits', userId: 'DUP1' }), cfg);
      if (r.triggered) anyTrigger = true;
    }
    return anyTrigger;
  });

  await test('antiemojispam: 12 emojis → trigger', async () =>
    (await d('antiemojispam').check(mockMessage({ content: '🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉' }), { threshold: 8 })).triggered);

  // ═══ 2. DÉTECTEURS FORTERESSE (membre) ═══════════════════════════════════
  await test('antibot: bot qui rejoint → trigger', async () =>
    (await d('antibot').checkNewMember(mockMember({ bot: true }), { enabled: 1 })).triggered);

  await test('antinewaccount: compte de 1 jour (seuil 7j) → trigger', async () =>
    (await d('antinewaccount').checkNewMember(mockMember({ createdDaysAgo: 1 }), { enabled: 1, threshold: 7 })).triggered);
  await test('antinewaccount: compte de 1 an → pas de trigger', async () =>
    !(await d('antinewaccount').checkNewMember(mockMember({ createdDaysAgo: 365 }), { enabled: 1, threshold: 7 })).triggered);

  await test('antiraid: 6 joins rapides (seuil 5) → trigger', async () => {
    const det = d('antiraid');
    let last = { triggered: false };
    for (let i = 0; i < 6; i++) {
      last = await det.checkNewMember(mockMember({ userId: `RAID${i}` }), { enabled: 1, threshold: 5 });
    }
    return last.triggered;
  });

  // ═══ 3. NOUVEAUX ENFORCERS (fix audit) ═══════════════════════════════════
  const antispam = require('../bot/events/antispamEnforcer');
  const antileak = require('../bot/events/antileakEnforcer');
  const spamCfg = {
    flood_threshold: 5, flood_window_seconds: 5, flood_sanction: 'timeout',
    mentions_threshold: 5, mentions_sanction: 'timeout',
    repeat_threshold: 3, repeat_sanction: 'delete',
    caps_enabled: 1, caps_threshold: 70, caps_min_length: 10, caps_sanction: 'delete',
  };

  await test('antispam(NEW): flood 5 msgs/5s → trigger', () => {
    const state = { floodMap: new Map(), repeatMap: new Map() };
    let hit = null;
    for (let i = 0; i < 5; i++) hit = antispam.detect(mockMessage({ content: `spam ${i}`, userId: 'FLOOD1' }), spamCfg, state);
    return hit?.type === 'flood';
  });
  await test('antispam(NEW): mention spam → trigger', () => {
    const state = { floodMap: new Map(), repeatMap: new Map() };
    return antispam.detect(mockMessage({ userMentions: 6, userId: 'M2' }), spamCfg, state)?.type === 'mentions';
  });
  await test('antispam(NEW): message répété 3x → trigger', () => {
    const state = { floodMap: new Map(), repeatMap: new Map() };
    let hit = null;
    for (let i = 0; i < 3; i++) hit = antispam.detect(mockMessage({ content: 'meme message', userId: 'REP1' }), spamCfg, state);
    return hit?.type === 'repeat';
  });
  await test('antispam(NEW): caps abuse → trigger', () => {
    const state = { floodMap: new Map(), repeatMap: new Map() };
    return antispam.detect(mockMessage({ content: 'JE CRIE TRES FORT ICI', userId: 'CAPS1' }), spamCfg, state)?.type === 'caps';
  });

  const leakCfg = {
    detect_discord_token: 1, sanction_discord_token: 'ban',
    detect_ip: 1, sanction_ip: 'delete',
    detect_email: 1, sanction_email: 'delete',
    detect_phone: 1, sanction_phone: 'delete',
  };
  await test('antileak(NEW): token Discord → trigger', () =>
    antileak.detect('mon token: MTUxMzE4ODExODgyNjcxMzEwOA.GxYzAb.fake_token_for_test_padding_123456', leakCfg)?.type === 'discord_token');
  await test('antileak(NEW): IP publique → trigger', () =>
    antileak.detect('connecte toi sur 142.250.74.36:25565', leakCfg)?.type === 'ip');
  await test('antileak(NEW): IP privée 192.168 → ignorée', () =>
    antileak.detect('mon serveur local 192.168.1.10', leakCfg) === null);
  await test('antileak(NEW): email → trigger', () =>
    antileak.detect('contacte moi sur jean.dupont@gmail.com', leakCfg)?.type === 'email');
  await test('antileak(NEW): téléphone FR → trigger', () =>
    antileak.detect('appelle le 06 12 34 56 78', leakCfg)?.type === 'phone');

  // ═══ 4. STORAGE ROUNDTRIP ═════════════════════════════════════════════════
  await test('storage: setConfig + getConfig', () => {
    storage.setConfig(TEST_GUILD, 'antilink', { enabled: 1, action: 'delete' });
    return storage.getConfig(TEST_GUILD, 'antilink')?.enabled === 1;
  });
  await test('storage: whitelist add + check', () => {
    storage.addWhitelist(TEST_GUILD, 'user', 'WLUSER1', 'antilink', 'TESTER');
    return storage.isWhitelisted(TEST_GUILD, 'user', 'WLUSER1', 'antilink');
  });
  await test('storage: blacklist add + check + remove', () => {
    storage.addBlacklist(TEST_GUILD, 'BLUSER1', 'test', 'TESTER');
    const ok = storage.isBlacklisted(TEST_GUILD, 'BLUSER1');
    storage.removeBlacklist(TEST_GUILD, 'BLUSER1');
    return ok && !storage.isBlacklisted(TEST_GUILD, 'BLUSER1');
  });
  await test('storage: logAction + getRecentLogs', () => {
    storage.logAction(TEST_GUILD, 'LOGUSER1', 'antilink', 'delete', 'contenu test', 'C1');
    const logs = storage.getRecentLogs(TEST_GUILD, 5);
    return logs.length > 0 && logs[0].user_id === 'LOGUSER1';
  });

  // ═══ RAPPORT ════════════════════════════════════════════════════════════
  const passed = results.filter(r => r.passed).length;
  console.table(results);
  console.log(`\n${passed}/${results.length} tests passés`);
  process.exitCode = passed === results.length ? 0 : 1;
})();
