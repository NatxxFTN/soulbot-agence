'use strict';

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');
const fs               = require('fs');
const path             = require('path');

const ROOT = path.join(__dirname, '../..');

describe('Singleton Bot — Protection anti-doublons', () => {
  it('singleton-lock.js existe dans bot/core/', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'bot/core/singleton-lock.js')));
  });

  it('kill-bot.js existe dans scripts/', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts/kill-bot.js')));
  });

  it('nodemon.json existe avec delay >= 1000ms et signal SIGTERM', () => {
    const cfgPath = path.join(ROOT, 'nodemon.json');
    assert.ok(fs.existsSync(cfgPath), 'nodemon.json manquant');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    assert.ok(parseInt(cfg.delay, 10) >= 1000, `delay trop court: ${cfg.delay}`);
    assert.strictEqual(cfg.signal, 'SIGTERM');
  });

  it('bot/index.js appelle acquireLock() depuis singleton-lock', () => {
    const src = fs.readFileSync(path.join(ROOT, 'bot/index.js'), 'utf-8');
    assert.ok(src.includes('acquireLock'), 'acquireLock absent de index.js');
    assert.ok(src.includes('singleton-lock'), 'import singleton-lock absent');
  });

  it('bot/index.js a un gracefulShutdown qui gère SIGTERM et SIGINT', () => {
    const src = fs.readFileSync(path.join(ROOT, 'bot/index.js'), 'utf-8');
    assert.ok(src.includes('gracefulShutdown'), 'gracefulShutdown absent');
    assert.ok(src.includes('SIGTERM'), 'handler SIGTERM absent');
    assert.ok(src.includes('SIGINT'), 'handler SIGINT absent');
  });

  it('package.json a les hooks prestart et predev:bot', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    assert.ok(pkg.scripts['prestart']?.includes('kill-bot'), 'prestart manquant');
    assert.ok(pkg.scripts['predev:bot']?.includes('kill-bot'), 'predev:bot manquant');
  });

  it('.gitignore inclut .bot.lock', () => {
    const src = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
    assert.ok(src.includes('.bot.lock'), '.bot.lock absent du .gitignore');
  });
});
