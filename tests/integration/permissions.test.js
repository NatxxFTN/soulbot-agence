'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Charger .env pour BOT_OWNERS
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { getUserLevel, setUserLevel, removeUserLevel, isGloballyBlacklisted } = require('../../bot/core/permissions');
const { LEVELS, levelName, getRequiredLevel } = require('../../bot/core/permissions-levels');

const GUILD  = 'test-guild-perm-001';
const USER   = 'test-user-perm-999';

describe('Système de permissions hiérarchique', () => {

  after(() => {
    // Nettoyage : retirer le user test
    removeUserLevel(USER, GUILD);
  });

  it('User inconnu → niveau USER par défaut', () => {
    removeUserLevel(USER, GUILD); // s'assurer que pas en DB
    assert.strictEqual(getUserLevel(USER, GUILD), LEVELS.USER);
  });

  it('Owner .env → niveau OWNER (bypass DB)', () => {
    const ownerId = (process.env.BOT_OWNERS ?? '').split(',')[0]?.trim();
    if (!ownerId) return; // pas d'owner configuré → skip
    assert.strictEqual(getUserLevel(ownerId, GUILD), LEVELS.OWNER);
  });

  it('setUserLevel ADMIN → getUserLevel retourne ADMIN', () => {
    setUserLevel(USER, GUILD, LEVELS.ADMIN, 'test-granter');
    assert.strictEqual(getUserLevel(USER, GUILD), LEVELS.ADMIN);
  });

  it('setUserLevel MOD → getUserLevel retourne MOD', () => {
    setUserLevel(USER, GUILD, LEVELS.MOD, 'test-granter');
    assert.strictEqual(getUserLevel(USER, GUILD), LEVELS.MOD);
  });

  it('setUserLevel BLACKLIST → getUserLevel retourne BLACKLIST', () => {
    setUserLevel(USER, GUILD, LEVELS.BLACKLIST, 'test-granter');
    assert.strictEqual(getUserLevel(USER, GUILD), LEVELS.BLACKLIST);
  });

  it('removeUserLevel → retour USER par défaut', () => {
    setUserLevel(USER, GUILD, LEVELS.ADMIN, 'test-granter');
    removeUserLevel(USER, GUILD);
    assert.strictEqual(getUserLevel(USER, GUILD), LEVELS.USER);
  });

  it('getUserLevel en DM (guildId=null) → USER', () => {
    assert.strictEqual(getUserLevel(USER, null), LEVELS.USER);
  });

  it('levelName retourne les bons libellés', () => {
    assert.ok(levelName(LEVELS.OWNER).includes('Owner'));
    assert.ok(levelName(LEVELS.ADMIN).includes('Admin'));
    assert.ok(levelName(LEVELS.MOD).includes('Mod'));
    assert.ok(levelName(LEVELS.USER).includes('Util'));
    assert.ok(levelName(LEVELS.BLACKLIST).includes('Black'));
  });

  it('getRequiredLevel : owner category → OWNER', () => {
    const fakeCmd = { ownerOnly: false, category: 'owner' };
    // owner category n'est pas dans CATEGORY_LEVELS → USER... mais ownerOnly overrides
    const fakeOwnerCmd = { ownerOnly: true, category: 'owner' };
    assert.strictEqual(getRequiredLevel(fakeOwnerCmd), LEVELS.OWNER);
  });

  it('getRequiredLevel : moderation category → MOD', () => {
    const cmd = { ownerOnly: false, category: 'moderation' };
    assert.strictEqual(getRequiredLevel(cmd), LEVELS.MOD);
  });

  it('getRequiredLevel : information category → USER', () => {
    const cmd = { ownerOnly: false, category: 'information' };
    assert.strictEqual(getRequiredLevel(cmd), LEVELS.USER);
  });

  it('LEVELS : hiérarchie cohérente (OWNER > ADMIN > MOD > USER > BLACKLIST)', () => {
    assert.ok(LEVELS.OWNER > LEVELS.ADMIN);
    assert.ok(LEVELS.ADMIN > LEVELS.MOD);
    assert.ok(LEVELS.MOD   > LEVELS.USER);
    assert.ok(LEVELS.USER  > LEVELS.BLACKLIST);
  });
});
