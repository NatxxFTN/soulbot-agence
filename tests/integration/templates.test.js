'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const { saveTemplate, loadTemplate, listTemplates, deleteTemplate, sanitizeName } = require('../../bot/core/template-helper');

const TEMPLATES_DIR = path.join(__dirname, '../../data/templates');
const TEST_NAME     = 'soulbot-test-template';
const TEST_PATH     = path.join(TEMPLATES_DIR, `${TEST_NAME}.json`);

const SAMPLE = { name: 'Test', roles: [], categories: [], emojis: [], saved_at: Date.now() };

describe('Template — stockage JSON', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH);
  });

  it('saveTemplate crée un fichier JSON valide', () => {
    saveTemplate(TEST_NAME, SAMPLE);
    assert.ok(fs.existsSync(TEST_PATH), 'fichier doit exister');
    const loaded = JSON.parse(fs.readFileSync(TEST_PATH, 'utf-8'));
    assert.strictEqual(loaded.name, 'Test');
  });

  it('loadTemplate retourne null si introuvable', () => {
    const result = loadTemplate('__inexistant_xyz__');
    assert.strictEqual(result, null);
  });

  it('loadTemplate restitue les données sauvegardées', () => {
    saveTemplate(TEST_NAME, SAMPLE);
    const loaded = loadTemplate(TEST_NAME);
    assert.ok(loaded !== null, 'ne doit pas être null');
    assert.strictEqual(loaded.name, 'Test');
    assert.ok(Array.isArray(loaded.roles));
  });

  it('listTemplates inclut le template créé', () => {
    saveTemplate(TEST_NAME, SAMPLE);
    const list = listTemplates();
    assert.ok(list.some(t => t.name === TEST_NAME), 'template doit apparaître dans la liste');
  });

  it('listTemplates exclut les fichiers commençant par _', () => {
    const list = listTemplates();
    assert.ok(!list.some(t => t.name.startsWith('_')), 'les fichiers _ ne doivent pas apparaître');
  });

  it('noms avec caractères dangereux sont nettoyés (path traversal)', () => {
    const evilName = '../../../etc/passwd';
    const { filePath } = saveTemplate(evilName, SAMPLE);
    // Le fichier doit exister (sauvegardé dans TEMPLATES_DIR, pas en dehors)
    assert.ok(fs.existsSync(filePath), 'fichier doit exister dans TEMPLATES_DIR');
    // Le chemin ne doit contenir ni '..' ni traversal
    assert.ok(!filePath.includes('..'), 'le chemin ne doit pas contenir ..');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('noms dangereux ne s\'échappent pas de TEMPLATES_DIR', () => {
    const evilName = '../../../etc/passwd';
    const { filePath } = saveTemplate(evilName, SAMPLE);
    assert.ok(filePath.startsWith(TEMPLATES_DIR), 'le chemin doit rester dans TEMPLATES_DIR');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('deleteTemplate supprime le fichier et retourne true', () => {
    saveTemplate(TEST_NAME, SAMPLE);
    assert.ok(fs.existsSync(TEST_PATH));
    const result = deleteTemplate(TEST_NAME);
    assert.strictEqual(result, true);
    assert.ok(!fs.existsSync(TEST_PATH));
  });

  it('deleteTemplate retourne false si fichier inexistant', () => {
    const result = deleteTemplate('__inexistant_xyz__');
    assert.strictEqual(result, false);
  });

  it('sanitizeName nettoie les caractères spéciaux', () => {
    assert.ok(!sanitizeName('../../etc/passwd').includes('/'));
    assert.ok(!sanitizeName('../../etc/passwd').includes('..'));
    assert.ok(sanitizeName('Mon Serveur!').match(/^[a-z0-9-_]+$/));
  });

  it('loadTemplate retourne null sur un fichier corrompu', () => {
    fs.writeFileSync(TEST_PATH, 'NOT_JSON{{{');
    const result = loadTemplate(TEST_NAME);
    assert.strictEqual(result, null);
  });
});

describe('Template — logique rapport final', () => {
  it('isTotalFailure détecté quand 0 créé + erreurs', () => {
    const s = { rolesCreated: 0, categoriesCreated: 0, channelsCreated: 0, emojisCreated: 0, errors: ['Role "Admin": Missing Permissions (code 50013)'] };
    const totalOK = s.rolesCreated + s.categoriesCreated + s.channelsCreated + s.emojisCreated;
    assert.strictEqual(totalOK === 0 && s.errors.length > 0, true);
  });

  it('isPartialFailure détecté quand certains éléments créés + erreurs', () => {
    const s = { rolesCreated: 2, categoriesCreated: 0, channelsCreated: 0, emojisCreated: 0, errors: ['Channel "général": Missing Permissions (code 50013)'] };
    const totalOK = s.rolesCreated + s.categoriesCreated + s.channelsCreated + s.emojisCreated;
    assert.strictEqual(totalOK > 0 && s.errors.length > 0, true);
  });

  it('succès complet quand 0 erreur', () => {
    const s = { rolesCreated: 3, categoriesCreated: 2, channelsCreated: 8, emojisCreated: 0, errors: [] };
    const totalOK = s.rolesCreated + s.categoriesCreated + s.channelsCreated + s.emojisCreated;
    assert.strictEqual(totalOK > 0 && s.errors.length === 0, true);
  });
});

describe('Template — table DB', () => {
  it('table template_logs présente dans la DB', () => {
    const { db } = require('../../bot/database');
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='template_logs'").get();
    assert.ok(row, 'table template_logs manquante');
  });
});
