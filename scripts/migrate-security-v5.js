'use strict';

// ═══════════════════════════════════════════════
// MIGRATION SOC Phase 1 — whitelists V4 → Vault unifié
// antispam_whitelist + antileak_whitelist (rôles) → security_whitelist
// (entity_type='role', feature='antispam'|'antileak').
// · Idempotent : INSERT OR IGNORE (index unique du vault)
// · Les tables sources NE SONT PAS supprimées (rollback trivial)
// Usage : node scripts/migrate-security-v5.js [--dry-run]
// ═══════════════════════════════════════════════

const dryRun = process.argv.includes('--dry-run');
const { db } = require('../bot/database');

const sources = [
  { table: 'antispam_whitelist', feature: 'antispam' },
  { table: 'antileak_whitelist', feature: 'antileak' },
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO security_whitelist (guild_id, entity_type, entity_id, feature, added_by, added_at)
  VALUES (?, 'role', ?, ?, ?, ?)
`);

let total = 0, migrated = 0;
for (const { table, feature } of sources) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  total += rows.length;
  console.log(`\n── ${table} : ${rows.length} ligne(s)`);
  for (const r of rows) {
    const exists = db.prepare(
      `SELECT 1 FROM security_whitelist WHERE guild_id = ? AND entity_type = 'role' AND entity_id = ? AND IFNULL(feature,'') = ?`,
    ).get(r.guild_id, r.role_id, feature);
    const tag = exists ? 'déjà présent' : (dryRun ? 'À MIGRER' : 'migré');
    console.log(`  [${tag}] guild=${r.guild_id} role=${r.role_id} → feature=${feature}`);
    if (!dryRun && !exists) {
      insert.run(r.guild_id, r.role_id, feature, r.added_by ?? 'migration-v5', r.added_at ? r.added_at * 1000 : Date.now());
      migrated++;
    }
    if (dryRun && !exists) migrated++;
  }
}

console.log(`\n${dryRun ? '[DRY-RUN] ' : ''}${migrated}/${total} ligne(s) ${dryRun ? 'seraient migrées' : 'migrées'}. Tables sources conservées (rollback).`);
