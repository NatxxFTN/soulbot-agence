'use strict';

/**
 * ═══════════════════════════════════════════════
 * UPLOAD EMOJIS — Soulbot (PNG statiques + GIF animés)
 * ═══════════════════════════════════════════════
 * Usage : node bot/scripts/upload-emojis.js
 *         npm run emojis:upload
 *
 * Requis dans .env :
 *   DISCORD_TOKEN=...
 *   EMOJI_GUILD_ID=... (serveur dédié, bot avec MANAGE_GUILD_EXPRESSIONS)
 *
 * Génère data/emojis-ids.json automatiquement.
 * ═══════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Client, GatewayIntentBits } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { setEmojiId, loadCache } = require('../core/emoji-cache');

const EMOJIS_DIR    = path.join(__dirname, '../assets/emojis');
const UPLOAD_DELAY  = 1500;

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  📤  UPLOAD EMOJIS SOULBOT (PNG + GIF)');
  console.log('═══════════════════════════════════════════\n');

  const token   = process.env.DISCORD_TOKEN;
  const guildId = process.env.EMOJI_GUILD_ID;

  if (!token) {
    console.error('❌ DISCORD_TOKEN manquant dans .env'); process.exit(1);
  }
  if (!guildId) {
    console.error('❌ EMOJI_GUILD_ID manquant dans .env');
    console.error('   1. Crée un serveur Discord dédié');
    console.error('   2. Invite le bot avec permission MANAGE_GUILD_EXPRESSIONS');
    console.error('   3. Ajoute dans .env : EMOJI_GUILD_ID=123456789012345678');
    process.exit(1);
  }

  if (!fs.existsSync(EMOJIS_DIR)) {
    console.error(`❌ Dossier introuvable : ${EMOJIS_DIR}`); process.exit(1);
  }

  const files    = fs.readdirSync(EMOJIS_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));
  const gifFiles = files.filter(f => f.endsWith('.gif'));

  console.log(`📁 Fichiers détectés :`);
  console.log(`   • ${pngFiles.length} statiques (.png)`);
  console.log(`   • ${gifFiles.length} animés (.gif)`);
  console.log(`   • ${pngFiles.length + gifFiles.length} total\n`);

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await client.login(token);
    console.log(`🤖 Connecté : ${client.user.tag}`);

    const guild = await client.guilds.fetch(guildId);
    console.log(`🏠 Serveur  : ${guild.name} (tier ${guild.premiumTier})\n`);

    // Emojis déjà en cache local
    const existing = loadCache();

    const allFiles = [...pngFiles, ...gifFiles];
    let uploaded = 0, skipped = 0, errors = 0;

    console.log('─── UPLOAD ─────────────────────────────────\n');

    for (const file of allFiles) {
      const name       = file.replace(/\.(png|gif)$/, '');
      const isAnimated = file.endsWith('.gif');

      if (existing[name]) {
        console.log(`⏭️  ${name} (déjà en cache)`);
        skipped++;
        continue;
      }

      try {
        const filePath = path.join(EMOJIS_DIR, file);
        const sizeMb   = fs.statSync(filePath).size;

        if (sizeMb > 262144) {
          console.warn(`⚠️  ${name} : ${(sizeMb / 1024).toFixed(0)}KB > 256KB Discord limit`);
          errors++; continue;
        }

        const emoji = await guild.emojis.create({ attachment: filePath, name });

        setEmojiId(name, emoji.id, emoji.animated);

        const icon = isAnimated ? '🎬' : '🖼️';
        console.log(`✅ ${icon} ${name} → ${emoji.id}`);
        uploaded++;

        await new Promise(r => setTimeout(r, UPLOAD_DELAY));

      } catch (err) {
        console.error(`❌ ${name} : ${err.message}`);
        errors++;
      }
    }

    const total = Object.keys(loadCache()).length;

    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ Uploadés      : ${uploaded}`);
    console.log(`⏭️  Déjà présents : ${skipped}`);
    console.log(`❌ Erreurs       : ${errors}`);
    console.log(`📊 Total cache   : ${total} emojis`);
    console.log('═══════════════════════════════════════════\n');

    if (errors > 0) {
      console.log('⚠️  Certains emojis ont échoué. Les fallbacks Unicode seront utilisés.');
    } else {
      console.log('🎉 Upload complet ! Relance le bot pour activer les emojis custom.');
    }

  } catch (err) {
    console.error('❌ Erreur fatale :', err.message);
    process.exit(1);
  } finally {
    client.destroy();
  }

  process.exit(0);
}

main();
