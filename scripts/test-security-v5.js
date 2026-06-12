'use strict';

// ═══════════════════════════════════════════════
// TESTS OFFLINE — SECURITY STUDIO V5 + SOC Phase 1
// Registry · ladder/récidives · vault-only · garde-fous · antinuke · hub CV2
// Écrit UNIQUEMENT sous TEST_SECSTUDIO_GUILD, nettoyé en fin de run.
// Usage : node scripts/test-security-v5.js
// ═══════════════════════════════════════════════

const TEST_GUILD = 'TEST_SECSTUDIO_GUILD';
const results = [];
function check(name, cond) { results.push({ test: name, ok: !!cond }); }

const { db } = require('../bot/database');
const registry = require('../bot/core/security-registry');
const ladder = require('../bot/core/security-ladder');
const antinuke = require('../bot/core/security-detectors/antinuke');
const { sanctionBlockReason } = require('../bot/core/apply-sanction');
const { renderHub, renderDisableAllConfirm } = require('../bot/ui/panels/security-studio');

function cleanup() {
  db.prepare('DELETE FROM security_config    WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare('DELETE FROM antispam_config    WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare('DELETE FROM antileak_config    WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare('DELETE FROM security_ladder    WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare('DELETE FROM security_offenses  WHERE guild_id = ?').run(TEST_GUILD);
  db.prepare('DELETE FROM security_whitelist WHERE guild_id = ?').run(TEST_GUILD);
}

try {
  cleanup();

  // ── 1. Catalogue : 12 Forteresse + antispam + antileak + antinuke = 15 ──
  check('registry: 15 modules au catalogue', registry.MODULES.length === 15);
  const mods = registry.listModules(TEST_GUILD);
  check('listModules: 15 modules retournés', mods.length === 15);
  check('listModules: tous les champs requis présents',
    mods.every(m => m.key && m.label && m.cat && typeof m.enabled === 'boolean' && m.sanctionLabel));
  check('listModules: guild vierge → tout désactivé', mods.every(m => !m.enabled));
  check('listModules: messages(11) + joins(3) + server(1)',
    mods.filter(m => m.cat === 'messages').length === 11 &&
    mods.filter(m => m.cat === 'joins').length === 3 &&
    mods.filter(m => m.cat === 'server').length === 1);
  check('antinuke présent au catalogue', !!registry.MODULES_BY_KEY.get('antinuke'));

  // ── 2. Normalisation legacy ──────────────────────────────────────────
  const n1 = registry.normalizeSanction('mute_5m');
  check('normalize: mute_5m → timeout 5 min',  n1.sanction === 'timeout' && n1.timeoutMinutes === 5);
  check('normalize: mute_1h → timeout 60 min', registry.normalizeSanction('mute_1h').timeoutMinutes === 60);
  check('normalize: ban inchangé', registry.normalizeSanction('ban').sanction === 'ban');

  // ── 3. Toggles (fortress + V4 + première activation antileak) ─────────
  registry.setEnabled(TEST_GUILD, 'antilink', true);
  check('setEnabled fortress: antilink ON', registry.getModule(TEST_GUILD, 'antilink').enabled === true);
  check('toggleEnabled: antilink → OFF', registry.toggleEnabled(TEST_GUILD, 'antilink') === false);
  registry.setEnabled(TEST_GUILD, 'antileak', true, 'tester');
  check('antileak: première activation crée la ligne',
    db.prepare('SELECT enabled FROM antileak_config WHERE guild_id = ?').get(TEST_GUILD)?.enabled === 1);
  registry.setEnabled(TEST_GUILD, 'antinuke', true);
  check('antinuke: activable via registry', registry.getModule(TEST_GUILD, 'antinuke').enabled === true);

  // ── 4. LADDER : calibration « jamais plus faible que le plancher » ─────
  const dl = ladder.defaultLadderFor('timeout', 5);
  check('ladder défaut (plancher timeout): 1er palier = timeout 5min',
    dl[0].action === 'timeout' && dl[0].duration === 300);
  check('ladder défaut (plancher ban): un seul palier ban',
    ladder.defaultLadderFor('ban').length === 1 && ladder.defaultLadderFor('ban')[0].action === 'ban');
  check('strongerAction: clamp warn vs kick → kick', ladder.strongerAction('warn', 'kick') === 'kick');

  // Escalade complète avec horloge injectée (plancher delete)
  const T0 = 1_000_000_000_000;
  const esc = [];
  for (let i = 0; i < 12; i++) {
    esc.push(ladder.resolveSanction(TEST_GUILD, 'U_LADDER', 'antispam', 'delete', 10, T0 + i * 1000));
  }
  check('ladder: récidive 1 → delete',  esc[0].action === 'delete' && esc[0].count === 1);
  check('ladder: récidive 3 → warn',    esc[2].action === 'warn');
  check('ladder: récidive 5 → timeout', esc[4].action === 'timeout' && esc[4].durationMs === 600_000);
  check('ladder: récidive 8 → kick',    esc[7].action === 'kick');
  check('ladder: récidive 12 → ban',    esc[11].action === 'ban');

  // Fenêtre expirée → compte repart à 1
  const afterWindow = ladder.resolveSanction(TEST_GUILD, 'U_LADDER', 'antispam', 'delete', 10, T0 + 700_000);
  check('ladder: fenêtre expirée → reset à 1', afterWindow.count === 1 && afterWindow.action === 'delete');

  // Clamp calibration : plancher kick, palier 1 → kick (jamais delete)
  const clamped = ladder.resolveSanction(TEST_GUILD, 'U_CLAMP', 'antispam', 'kick', 10, T0);
  check('ladder: clamp plancher kick → 1re détection = kick', clamped.action === 'kick');

  // Mode fixe (la voie de retour)
  registry.setLadderMode(TEST_GUILD, 'antilink', 'fixed', 'tester');
  const fixed = registry.sanctionForTrigger(TEST_GUILD, 'U_FIXED', 'antilink', 'mute_5m');
  check('mode fixe: sanction = plancher (timeout 5m), pas d\'escalade',
    fixed.mode === 'fixed' && fixed.action === 'timeout' && fixed.durationMs === 300_000);
  registry.setLadderMode(TEST_GUILD, 'antilink', 'ladder', 'tester');
  check('mode: retour en ladder OK', registry.getLadderConfig(TEST_GUILD, 'antilink').mode === 'ladder');

  // ── 5. VAULT-ONLY isExempt ─────────────────────────────────────────────
  const { PermissionFlagsBits } = require('discord.js');
  function mockMessage(perms, roleIds = []) {
    return {
      guild  : { id: TEST_GUILD },
      channel: { id: 'CHAN1' },
      member : {
        id: 'USER1',
        permissions: { has: (p) => perms.includes(p) },
        roles: { cache: new Map(roleIds.map(r => [r, true])) },
      },
    };
  }
  check('vault-only: ManageMessages seul → PAS exempt (hack supprimé)',
    registry.isExempt(mockMessage([PermissionFlagsBits.ManageMessages]), 'antispam') === false);
  check('vault-only: Administrator seul → PAS exempt',
    registry.isExempt(mockMessage([PermissionFlagsBits.Administrator]), 'antispam') === false);
  const storage = require('../bot/core/security-storage');
  storage.addWhitelist(TEST_GUILD, 'role', 'STAFF_ROLE', null, 'tester'); // global = bouton staff
  check('vault: rôle staff global → exempt PARTOUT',
    registry.isExempt(mockMessage([], ['STAFF_ROLE']), 'antispam') === true &&
    registry.isExempt(mockMessage([], ['STAFF_ROLE']), 'antilink') === true);
  storage.addWhitelist(TEST_GUILD, 'role', 'ROLE_FEAT', 'antispam', 'tester');
  check('vault: rôle par feature → exempt ciblé seulement',
    registry.isExempt(mockMessage([], ['ROLE_FEAT']), 'antispam') === true &&
    registry.isExempt(mockMessage([], ['ROLE_FEAT']), 'antilink') === false);

  // ── 6. GARDE-FOUS apply-sanction ───────────────────────────────────────
  const mkMember = (id, ownerId, botId) => ({
    id, guild: { ownerId }, client: { user: { id: botId } },
  });
  check('garde-fou: owner → bloqué', sanctionBlockReason(mkMember('U1', 'U1', 'BOT')) === 'owner du serveur');
  check('garde-fou: bot lui-même → bloqué', sanctionBlockReason(mkMember('BOT', 'U1', 'BOT')) === 'le bot lui-même');
  check('garde-fou: membre normal → autorisé', sanctionBlockReason(mkMember('U2', 'U1', 'BOT')) === null);
  check('garde-fou: membre null → pas de blocage (rien à faire)', sanctionBlockReason(null) === null);

  // ── 7. ANTI-NUKE (détection pure, état injecté) ────────────────────────
  const nukeState = new Map();
  const nukeCfg = { threshold: 3, custom_data: JSON.stringify({ window_seconds: 60 }) };
  let nukeHit = null;
  for (let i = 0; i < 3; i++) {
    nukeHit = antinuke.recordAction(TEST_GUILD, 'MODX', 'channel_delete', nukeCfg, T0 + i * 1000, nukeState);
  }
  check('antinuke: 3 suppressions/60s (seuil 3) → trigger', nukeHit?.triggered === true && nukeHit.count === 3);
  check('antinuke: état reset après trigger (pas de boucle)', !nukeState.has(`${TEST_GUILD}:MODX`));
  const slow = new Map();
  antinuke.recordAction(TEST_GUILD, 'MODY', 'ban', nukeCfg, T0, slow);
  const slowHit = antinuke.recordAction(TEST_GUILD, 'MODY', 'ban', nukeCfg, T0 + 120_000, slow);
  check('antinuke: 2 actions espacées de 2 min → PAS de trigger (anti-faux-positif)', slowHit === null);

  // ── 8. Rendu hub CV2 ──────────────────────────────────────────────────
  const fakeGuild = { id: TEST_GUILD, name: 'Serveur Test' };
  const hubJson = renderHub(fakeGuild).toJSON();
  check('hub: ContainerBuilder valide (type 17)', hubJson.type === 17);
  // Depuis 2B l'accent du hub SUIT LA POSTURE (vert/ambre/rouge) — le rouge
  // fixe reste la règle des confirmations destructives uniquement.
  check('hub: accent = couleur de posture (vert/ambre/rouge)',
    [0x00FF88, 0xFFD700, 0xFF0000].includes(hubJson.accent_color));
  const innerCount = JSON.stringify(hubJson).match(/"type":/g).length;
  check(`hub: budget composants ${innerCount} ≤ 40`, innerCount <= 40);
  const hubStr = JSON.stringify(hubJson);
  check('hub: les 15 modules listés', registry.MODULES.every(m => hubStr.includes(m.label)));
  check('hub: bouton staff-role présent', hubStr.includes('security:hub:staffrole'));
  check('hub: plus de bouton exemption modos', !hubStr.includes('security:hub:exempt'));
  const confirm = renderDisableAllConfirm(fakeGuild).toJSON();
  check('confirm disableall: rendu + rouge + boutons yes/no',
    confirm.type === 17 && confirm.accent_color === 0xFF0000 &&
    JSON.stringify(confirm).includes('disableall:yes') && JSON.stringify(confirm).includes('disableall:no'));

  // ── 9. DEFENSE GRID 2A — state, score, posture, rendu PNG ─────────────
  const { buildSocState, computeScore, computePosture, SCORE_WEIGHTS } = require('../bot/core/soc-state');
  const { renderDashboard, isCanvasAvailable, RENDER_BUDGET_MS } = require('../bot/ui/renderers/soc-dashboard-renderer');
  const { buildHubPayload } = require('../bot/ui/soc-image');

  check('score: poids totalisent 100', Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0) === 100);
  for (const m of registry.MODULES) registry.setEnabled(TEST_GUILD, m.key, false); // état propre (sections 3 laissent des modules ON)
  check('score: tout désarmé → 0', computeScore(registry.listModules(TEST_GUILD)) === 0);
  for (const m of registry.MODULES) registry.setEnabled(TEST_GUILD, m.key, true);
  check('score: tout armé → 100', computeScore(registry.listModules(TEST_GUILD)) === 100);

  const NOW = T0;
  check('posture: score 100, aucun incident → SECURE', computePosture(100, null, NOW) === 'SECURE');
  check('posture: incident il y a 5 min → BREACH', computePosture(100, NOW - 5 * 60_000, NOW) === 'BREACH');
  check('posture: incident il y a 30 min → ELEVATED', computePosture(100, NOW - 30 * 60_000, NOW) === 'ELEVATED');
  check('posture: score 30 sans incident → ELEVATED', computePosture(30, null, NOW) === 'ELEVATED');

  const state = buildSocState({ id: TEST_GUILD, name: 'Test' });
  check('state: structure complète',
    state.opName && state.themeKey && state.posture && typeof state.score === 'number' &&
    state.incidents24h.length === 24 && state.modules.length === 15 &&
    state.defcon >= 1 && state.defcon <= 5);

  check('canvas: @napi-rs/canvas disponible', isCanvasAvailable());
  if (isCanvasAvailable()) {
    const t0r = Date.now();
    const png = renderDashboard(state);
    const renderMs = Date.now() - t0r;
    check('renderer: retourne un Buffer PNG (magic bytes)',
      Buffer.isBuffer(png) && png[1] === 0x50 && png[2] === 0x4E && png[3] === 0x47);
    check(`renderer: ${renderMs}ms dans le budget ${RENDER_BUDGET_MS}ms`, renderMs <= RENDER_BUDGET_MS);
    // Les 4 thèmes rendent sans erreur
    const themesOk = ['red_alert', 'matrix', 'ice', 'mono'].every(k =>
      Buffer.isBuffer(renderDashboard({ ...state, themeKey: k })));
    check('renderer: les 4 thèmes (RED ALERT/MATRIX/ICE/MONO) rendent', themesOk);
    // Régression : arc de score plein (bug skia sweep=2π depuis -π/2)
    try {
      const nc = require('@napi-rs/canvas');
      const img = new nc.Image();
      img.src = png; // décodage sync
      const cv2 = nc.createCanvas(1000, 520);
      const c2 = cv2.getContext('2d');
      c2.drawImage(img, 0, 0);
      const px = c2.getImageData(150, 270 - 85, 1, 1).data; // haut de l'anneau
      const isBorderGrey = px[0] === 42 && px[1] === 42 && px[2] === 42;
      check('renderer: arc de score 100 réellement dessiné (pixel non-gris)', !isBorderGrey);
    } catch { check('renderer: arc de score 100 réellement dessiné (pixel non-gris)', false); }
    // Preview locale pour validation visuelle avant Discord
    require('fs').writeFileSync(require('path').join(__dirname, '../data/soc-preview.png'), png);
    check('preview: data/soc-preview.png écrite', require('fs').existsSync(require('path').join(__dirname, '../data/soc-preview.png')));
  }
  check('renderer: state corrompu → null, pas de crash', renderDashboard(null) === null);

  const payload = buildHubPayload({ id: TEST_GUILD, name: 'Test' });
  check('payload: image jointe quand canvas dispo',
    !isCanvasAvailable() || (Array.isArray(payload.files) && payload.files.length === 1));
  const galleryJson = JSON.stringify(renderHub({ id: TEST_GUILD, name: 'Test' }, { withImage: true }).toJSON());
  check('hub withImage: MediaGallery attachment://soc.png', galleryJson.includes('attachment://soc.png'));
  check('hub sans image: pas de gallery', !JSON.stringify(renderHub({ id: TEST_GUILD }).toJSON()).includes('attachment://'));
  const innerWithImage = galleryJson.match(/"type":/g).length;
  check(`hub withImage: budget ${innerWithImage} ≤ 40`, innerWithImage <= 40);

  // ── 10. DEFENSE GRID 2B — accent posture, feed, dock, exports ─────────
  const mkState = (posture, color) => ({ ...state, posture, postureColor: color });
  const hubSecure = renderHub({ id: TEST_GUILD }, { state: mkState('SECURE', 0x00FF88) }).toJSON();
  const hubBreach = renderHub({ id: TEST_GUILD }, { state: mkState('BREACH', 0xFF0000) }).toJSON();
  const hubElev   = renderHub({ id: TEST_GUILD }, { state: mkState('ELEVATED', 0xFFD700) }).toJSON();
  check('2B accent: SECURE → vert 0x00FF88',   hubSecure.accent_color === 0x00FF88);
  check('2B accent: ELEVATED → ambre 0xFFD700', hubElev.accent_color === 0xFFD700);
  check('2B accent: BREACH → rouge 0xFF0000',  hubBreach.accent_color === 0xFF0000);

  const hubStr2 = JSON.stringify(hubSecure);
  check('2B feed: bloc code terminal présent', hubStr2.includes('```'));
  check('2B dock: 4 boutons LOCKDOWN/PANIC/QUARANTINE/SCAN',
    ['security:dock:lockdown', 'security:dock:panic', 'security:dock:quarantine', 'security:dock:scan']
      .every(id => hubStr2.includes(id)));

  const { renderLockdownConfirm, renderPanicConfirm } = require('../bot/ui/panels/security-studio');
  const ldc = renderLockdownConfirm({ id: TEST_GUILD, name: 'Test' }).toJSON();
  const pnc = renderPanicConfirm({ id: TEST_GUILD, name: 'Test' }).toJSON();
  check('2B confirm lockdown: rouge + lock/unlock/annuler',
    ldc.accent_color === 0xFF0000 &&
    JSON.stringify(ldc).includes('lockdown:lock') && JSON.stringify(ldc).includes('lockdown:unlock') &&
    JSON.stringify(ldc).includes('lockdown:no'));
  check('2B confirm panic: rouge + yes/no',
    pnc.accent_color === 0xFF0000 &&
    JSON.stringify(pnc).includes('panic:yes') && JSON.stringify(pnc).includes('panic:no'));

  const lockdownHandler = require('../bot/ui/handlers/lockdown-handler');
  check('2B export: executeLock/executeUnlock disponibles',
    typeof lockdownHandler.executeLock === 'function' && typeof lockdownHandler.executeUnlock === 'function');
  const quarantineCmd = require('../bot/commands/audit-mod/quarantine');
  check('2B export: quarantineMember disponible (cœur partagé)',
    typeof quarantineCmd.quarantineMember === 'function' && typeof quarantineCmd.getActiveQuarantine === 'function');

  const innerWith2B = JSON.stringify(renderHub({ id: TEST_GUILD }, { withImage: true, state: mkState('SECURE', 0x00FF88) }).toJSON()).match(/"type":/g).length;
  check(`2B budget: hub complet ${innerWith2B} ≤ 40`, innerWith2B <= 40);
  for (const m of registry.MODULES) registry.setEnabled(TEST_GUILD, m.key, false);

  // Zéro Unicode dans les SOURCES (offline, e() fallback Unicode est attendu)
  const fs = require('fs');
  const path = require('path');
  const sources = [
    '../bot/ui/panels/security-studio.js',
    '../bot/ui/handlers/security-studio-handler.js',
    '../bot/core/security-registry.js',
    '../bot/core/security-ladder.js',
    '../bot/core/security-detectors/antinuke.js',
    '../bot/events/antispamEnforcer.js',
    '../bot/events/antileakEnforcer.js',
    '../bot/events/securityListener.js',
  ].map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  check('sources SOC: aucun emoji Unicode hardcodé',
    !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(sources));

  // Régression COMPONENT_INVALID_EMOJI : tout forButton('x') des surfaces SOC
  // doit référencer un emoji du serveur ACCESSIBLE au bot (1063235865071063122).
  // ui_user/ui_members & co vivent sur 1063235055356493887 où le bot n'est pas
  // → Discord rejette le composant entier (vécu en live le 12/06).
  // La garde isEmojiUsable empêche tout COMPONENT_INVALID_EMOJI : un emoji
  // hébergé sur un serveur où le bot n'est pas → écarté (pas de crash).
  {
    const cache = require('../bot/core/emoji-cache');
    const { forButton } = require('../bot/core/emojis');
    cache.setAccessibleGuilds(['1063235865071063122']); // simule : bot SUR le bon serveur
    check('garde: emoji du serveur accessible → utilisable',
      cache.isEmojiUsable({ id: '1', guildId: '1063235865071063122' }) === true);
    check('garde: emoji d\'un serveur inaccessible → écarté',
      cache.isEmojiUsable({ id: '1', guildId: '1063235055356493887' }) === false);
    check('garde: entrée legacy sans guildId → tolérée',
      cache.isEmojiUsable({ id: '1' }) === true);
    check('garde: forButton emoji inaccessible → fallback (jamais d\'objet invalide)',
      typeof forButton('ui_user') === 'string'); // ui_user est sur le serveur inaccessible
    cache.setAccessibleGuilds(['1063235865071063122', '1063235055356493887']); // bot sur les 2
    check('garde: forButton emoji accessible → objet {id} valide',
      typeof forButton('ui_user') === 'object' && !!forButton('ui_user').id);
    cache.setAccessibleGuilds(null); // restaure l'état "inconnu" pour ne rien fausser

    const ids = require('../data/emojis-ids.json');
    const usedKeys = [...sources.matchAll(/forButton\('([a-z_]+)'\)/g)].map(m => m[1]);
    const all = [...new Set([...usedKeys, ...registry.MODULES.map(m => m.emoji)])];
    const missing = all.filter(k => !ids[k]);
    if (missing.length) console.log(`[emojis] À UPLOADER (fallback Unicode actif) : ${missing.join(', ')}`);
  }

} finally {
  cleanup();
  check('cleanup: aucune trace TEST en DB',
    !db.prepare('SELECT 1 FROM security_config WHERE guild_id = ?').get(TEST_GUILD) &&
    !db.prepare('SELECT 1 FROM security_ladder WHERE guild_id = ?').get(TEST_GUILD) &&
    !db.prepare('SELECT 1 FROM security_offenses WHERE guild_id = ?').get(TEST_GUILD) &&
    !db.prepare('SELECT 1 FROM security_whitelist WHERE guild_id = ?').get(TEST_GUILD));
}

console.table(results.map(r => ({ ...r, ok: r.ok ? true : '✗ FAIL' })));
const passed = results.filter(r => r.ok === true).length;
console.log(`\n${passed}/${results.length} tests passés`);
process.exit(passed === results.length ? 0 : 1);
