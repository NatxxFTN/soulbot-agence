'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const testId = process.argv[2];
if (!testId) {
  console.log('Usage: node scripts/test-owner.js <USER_ID>');
  process.exit(1);
}

const rawOwnerIds = process.env.OWNER_IDS || process.env.BOT_OWNERS || '';
const parsedIds   = rawOwnerIds.split(',').map(s => s.trim()).filter(s => /^\d{15,20}$/.test(s));
const isOwner     = parsedIds.includes(String(testId));

console.log('─────────────────────────────');
console.log('Test isOwner()');
console.log('─────────────────────────────');
console.log('OWNER_IDS    :', JSON.stringify(process.env.OWNER_IDS   ?? '(non défini)'));
console.log('BOT_OWNERS   :', JSON.stringify(process.env.BOT_OWNERS  ?? '(non défini)'));
console.log('IDs parsés   :', parsedIds.length > 0 ? parsedIds.join(', ') : '(aucun)');
console.log('ID testé     :', testId);
console.log('Résultat     :', isOwner ? '✅ OWNER reconnu' : '❌ NON OWNER');
console.log('─────────────────────────────');

if (!isOwner && parsedIds.length === 0) {
  console.log('⚠️  OWNER_IDS et BOT_OWNERS sont vides ou absents du .env');
}
if (!isOwner && parsedIds.length > 0) {
  console.log(`⚠️  L'ID "${testId}" n'est pas dans la liste : [${parsedIds.join(', ')}]`);
}
