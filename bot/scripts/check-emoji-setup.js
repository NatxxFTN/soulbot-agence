'use strict';

/**
 * ═══════════════════════════════════════════════
 * CHECK EMOJI SETUP — Soulbot
 * ═══════════════════════════════════════════════
 * Vérifie que tout est prêt pour l'upload des emojis.
 * À lancer AVANT npm run emojis:upload.
 *
 * Usage : node bot/scripts/check-emoji-setup.js
 *         npm run emojis:check
 * ═══════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const EMOJIS_DIR = path.join(__dirname, '../assets/emojis');

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('🔍 CHECK SETUP EMOJIS SOULBOT');
  console.log('═══════════════════════════════════════════\n');

  let errors   = 0;
  let warnings = 0;

  // ─── Check 1 : Variables .env ───────────────────────────────────────────────
  console.log('📋 Check 1 : Variables .env');
  const token   = process.env.DISCORD_TOKEN;
  const guildId = process.env.EMOJI_GUILD_ID;

  if (!token) {
    console.log('   ❌ DISCORD_TOKEN manquant');
    errors++;
  } else {
    console.log(`   ✅ DISCORD_TOKEN présent (${token.substring(0, 10)}...)`);
  }

  if (!guildId) {
    console.log('   ❌ EMOJI_GUILD_ID manquant dans .env');
    console.log('      Ajoute : EMOJI_GUILD_ID=123456789012345678');
    errors++;
  } else {
    const cleanId = guildId.trim().replace(/['"]/g, '');

    if (cleanId !== guildId) {
      console.log(`   ⚠️  EMOJI_GUILD_ID contient espaces/guillemets`);
      console.log(`      Actuel   : "${guildId}"`);
      console.log(`      Corrigé  : ${cleanId}`);
      warnings++;
    }

    if (!/^\d{17,20}$/.test(cleanId)) {
      console.log(`   ❌ EMOJI_GUILD_ID invalide (doit être 17-20 chiffres)`);
      console.log(`      Actuel  : "${cleanId}"`);
      console.log(`      Exemple : 1234567890123456789`);
      console.log('');
      console.log('   💡 Pour obtenir l\'ID :');
      console.log('      1. Discord → Paramètres utilisateur → Avancés');
      console.log('      2. Active "Mode développeur"');
      console.log('      3. Clic droit sur le SERVEUR (icône en haut à gauche)');
      console.log('      4. "Copier l\'identifiant du serveur"');
      console.log('      5. Colle dans .env : EMOJI_GUILD_ID=<id>');
      errors++;
    } else {
      console.log(`   ✅ EMOJI_GUILD_ID valide : ${cleanId}`);
    }
  }

  // ─── Check 2 : Dossier emojis ───────────────────────────────────────────────
  console.log('\n📋 Check 2 : Dossier bot/assets/emojis/');

  if (!fs.existsSync(EMOJIS_DIR)) {
    console.log(`   ❌ Dossier introuvable : ${EMOJIS_DIR}`);
    errors++;
  } else {
    const files = fs.readdirSync(EMOJIS_DIR);
    const pngs  = files.filter(f => f.endsWith('.png'));
    const gifs  = files.filter(f => f.endsWith('.gif'));
    const total = pngs.length + gifs.length;

    console.log(`   ✅ Dossier existe`);
    console.log(`   📊 ${pngs.length} fichiers .png`);
    console.log(`   📊 ${gifs.length} fichiers .gif`);
    console.log(`   📊 ${total} total`);

    if (total === 0) {
      console.log('   ❌ Aucun fichier à uploader');
      errors++;
    }

    for (const file of [...pngs, ...gifs]) {
      const stats = fs.statSync(path.join(EMOJIS_DIR, file));
      if (stats.size > 262144) {
        console.log(`   ⚠️  ${file} : ${(stats.size / 1024).toFixed(0)}KB > 256KB (limite Discord)`);
        warnings++;
      }
    }
  }

  if (errors > 0) {
    console.log('\n═══════════════════════════════════════════');
    console.log(`❌ ${errors} erreur(s) détectée(s). Fix avant de continuer.`);
    console.log('═══════════════════════════════════════════\n');
    process.exit(1);
  }

  // ─── Check 3 : Connexion Discord ────────────────────────────────────────────
  console.log('\n📋 Check 3 : Connexion Discord');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await client.login(token);
    console.log(`   ✅ Bot connecté : ${client.user.tag}`);

    // ─── Check 4 : Serveurs du bot ────────────────────────────────────────────
    console.log('\n📋 Check 4 : Serveurs du bot');
    const guilds   = client.guilds.cache;
    const cleanId  = guildId.trim().replace(/['"]/g, '');

    console.log(`   📊 Bot présent dans ${guilds.size} serveur(s)`);

    if (guilds.size === 0) {
      console.log('   ❌ Le bot n\'est dans AUCUN serveur !');
      errors++;
    } else {
      console.log('\n   Liste des serveurs :');
      guilds.forEach(g => {
        const match = g.id === cleanId ? ' ← CIBLE ✅' : '';
        console.log(`   • ${g.name} (${g.id})${match}`);
      });
    }

    // ─── Check 5 : Serveur cible ──────────────────────────────────────────────
    console.log(`\n📋 Check 5 : Serveur cible (${cleanId})`);

    let guild;
    try {
      guild = await client.guilds.fetch(cleanId);
    } catch {
      console.log('   ❌ Serveur introuvable ou bot pas membre');
      console.log('   💡 Solutions :');
      console.log('      1. Vérifie que l\'ID est correct');
      console.log(`      2. Invite le bot dans ce serveur :`);
      console.log(`         https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=1073741824&scope=bot`);
      client.destroy();
      process.exit(1);
    }

    console.log(`   ✅ Serveur trouvé : ${guild.name}`);
    console.log(`   📊 Tier boost     : ${guild.premiumTier}`);
    const slots = guild.premiumTier === 0 ? 50 : guild.premiumTier === 1 ? 100 : guild.premiumTier === 2 ? 150 : 250;
    console.log(`   📊 Slots emojis   : ${slots}`);
    console.log(`   📊 Emojis actuels : ${guild.emojis.cache.size}`);

    // ─── Check 6 : Permissions ────────────────────────────────────────────────
    console.log('\n📋 Check 6 : Permissions du bot');
    const me = await guild.members.fetchMe();

    const hasManageExpressions = me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions);
    const hasManageEmojis      = me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);

    if (hasManageExpressions || hasManageEmojis) {
      console.log('   ✅ Permission "Gérer les expressions" OK');
    } else {
      console.log('   ❌ Permission "Gérer les expressions" MANQUANTE');
      console.log('   💡 Solutions :');
      console.log('      1. Paramètres serveur → Rôles → rôle du bot');
      console.log('      2. Active "Gérer les expressions"');
      console.log('      OU réinvite le bot avec cette permission :');
      console.log(`         https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=1073741824&scope=bot`);
      errors++;
    }

    // ─── Résumé ───────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    if (errors === 0 && warnings === 0) {
      console.log('✅ TOUT EST BON !');
      console.log('   Lance : npm run emojis:upload');
    } else if (errors === 0) {
      console.log(`⚠️  ${warnings} avertissement(s) — upload possible mais vérifie quand même.`);
      console.log('   Lance : npm run emojis:upload');
    } else {
      console.log(`❌ ${errors} erreur(s), ⚠️  ${warnings} avertissement(s)`);
      console.log('   Fix avant de lancer l\'upload.');
    }
    console.log('═══════════════════════════════════════════\n');

    client.destroy();
    process.exit(errors > 0 ? 1 : 0);

  } catch (err) {
    console.error(`\n❌ Erreur connexion : ${err.message}`);
    client.destroy();
    process.exit(1);
  }
}

main();
