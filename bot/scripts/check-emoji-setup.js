'use strict';

/**
 * ═══════════════════════════════════════════════
 * CHECK EMOJI SETUP — Soulbot (multi-serveur)
 * ═══════════════════════════════════════════════
 * Vérifie que tout est prêt pour l'upload des emojis.
 * À lancer AVANT npm run emojis:upload.
 *
 * Usage : node bot/scripts/check-emoji-setup.js
 *         npm run emojis:check
 *
 * Supporte EMOJI_GUILD_ID, EMOJI_GUILD_ID_2, _3, _4.
 * ═══════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const EMOJIS_DIR = path.join(__dirname, '../assets/emojis');
const JSON_PATH  = path.join(__dirname, '../../data/emojis-ids.json');

const LIMIT_STATIC   = 50;
const LIMIT_ANIMATED = 50;

function getConfiguredGuildIds() {
  return [
    { label: 'EMOJI_GUILD_ID',   id: process.env.EMOJI_GUILD_ID   },
    { label: 'EMOJI_GUILD_ID_2', id: process.env.EMOJI_GUILD_ID_2 },
    { label: 'EMOJI_GUILD_ID_3', id: process.env.EMOJI_GUILD_ID_3 },
    { label: 'EMOJI_GUILD_ID_4', id: process.env.EMOJI_GUILD_ID_4 },
  ].filter(e => e.id).map(e => ({ label: e.label, id: e.id.trim().replace(/['"]/g, '') }));
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('🔍 CHECK SETUP EMOJIS SOULBOT (MULTI-SERVEUR)');
  console.log('═══════════════════════════════════════════\n');

  let errors   = 0;
  let warnings = 0;

  // ─── Check 1 : Variables .env ───────────────────────────────────────────────
  console.log('📋 Check 1 : Variables .env');
  const token   = process.env.DISCORD_TOKEN;
  const guilds  = getConfiguredGuildIds();

  if (!token) {
    console.log('   ❌ DISCORD_TOKEN manquant');
    errors++;
  } else {
    console.log(`   ✅ DISCORD_TOKEN présent (${token.substring(0, 10)}...)`);
  }

  if (guilds.length === 0) {
    console.log('   ❌ Aucune variable EMOJI_GUILD_ID* définie');
    console.log('      Ajoute au moins : EMOJI_GUILD_ID=123456789012345678');
    errors++;
  } else {
    console.log(`   ✅ ${guilds.length} serveur(s) configuré(s) :`);
    for (const g of guilds) {
      if (!/^\d{17,20}$/.test(g.id)) {
        console.log(`   ❌ ${g.label} invalide : "${g.id}" (attendu : 17-20 chiffres)`);
        errors++;
      } else {
        console.log(`      • ${g.label} : ***${g.id.slice(-4)} ✓`);
      }
    }
  }

  // ─── Check 2 : Dossier emojis ───────────────────────────────────────────────
  console.log('\n📋 Check 2 : Dossier bot/assets/emojis/');

  let files = [];
  if (!fs.existsSync(EMOJIS_DIR)) {
    console.log(`   ❌ Dossier introuvable : ${EMOJIS_DIR}`);
    errors++;
  } else {
    files      = fs.readdirSync(EMOJIS_DIR).filter(f => /\.(png|gif)$/i.test(f));
    const pngs = files.filter(f => f.endsWith('.png'));
    const gifs = files.filter(f => f.endsWith('.gif'));

    console.log(`   ✅ Dossier existe`);
    console.log(`   📊 ${pngs.length} fichiers .png · ${gifs.length} fichiers .gif · ${files.length} total`);

    if (files.length === 0) {
      console.log('   ⚠️  Aucun fichier — rien à uploader');
      warnings++;
    }

    for (const file of files) {
      const stats = fs.statSync(path.join(EMOJIS_DIR, file));
      if (stats.size > 262144) {
        console.log(`   ⚠️  ${file} : ${(stats.size / 1024).toFixed(0)}KB > 256KB (limite Discord)`);
        warnings++;
      }
    }
  }

  // ─── Check 3 : JSON local ───────────────────────────────────────────────────
  console.log('\n📋 Check 3 : data/emojis-ids.json');
  let cache = {};
  if (fs.existsSync(JSON_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
      const names = Object.keys(cache);
      const withGuildId = names.filter(n => cache[n].guildId).length;
      console.log(`   ✅ ${names.length} emoji(s) en cache · ${withGuildId} avec guildId`);
      if (withGuildId < names.length) {
        console.log(`   ⚠️  ${names.length - withGuildId} emoji(s) sans guildId (migration au prochain upload)`);
        warnings++;
      }
    } catch (err) {
      console.log(`   ❌ JSON corrompu : ${err.message}`);
      errors++;
    }
  } else {
    console.log('   ℹ️  Aucun cache existant (normal au 1er run)');
  }

  // ─── Stop si erreurs bloquantes ─────────────────────────────────────────────
  if (errors > 0) {
    console.log('\n═══════════════════════════════════════════');
    console.log(`❌ ${errors} erreur(s) détectée(s). Fix avant de continuer.`);
    console.log('═══════════════════════════════════════════\n');
    process.exit(1);
  }

  // ─── Check 4 : Connexion Discord ────────────────────────────────────────────
  console.log('\n📋 Check 4 : Connexion Discord + serveurs cibles');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    const ready = new Promise(res => client.once('clientReady', res));
    await client.login(token);
    await ready;
    console.log(`   ✅ Bot connecté : ${client.user.tag}\n`);

    const existingNames = new Set(Object.keys(cache));
    const pendingFiles  = files.filter(f => !existingNames.has(f.replace(/\.(png|gif)$/i, '')));

    let totalStaticSlots   = 0;
    let totalAnimatedSlots = 0;

    for (const g of guilds) {
      console.log(`   ── ${g.label} (***${g.id.slice(-4)}) ──`);

      let guild;
      try {
        guild = await client.guilds.fetch(g.id);
        await guild.emojis.fetch();
      } catch (err) {
        console.log(`   ❌ Inaccessible : ${err.message}`);
        errors++;
        continue;
      }

      const me = await guild.members.fetchMe();
      const hasPerms = me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)
                    || me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);

      const staticCount   = guild.emojis.cache.filter(em => !em.animated).size;
      const animatedCount = guild.emojis.cache.filter(em =>  em.animated).size;
      const staticSlots   = LIMIT_STATIC   - staticCount;
      const animatedSlots = LIMIT_ANIMATED - animatedCount;

      totalStaticSlots   += staticSlots;
      totalAnimatedSlots += animatedSlots;

      console.log(`   ✅ Serveur : ${guild.name} · tier ${guild.premiumTier}`);
      console.log(`      Statiques : ${staticCount}/${LIMIT_STATIC} (${staticSlots} libres)`);
      console.log(`      Animés    : ${animatedCount}/${LIMIT_ANIMATED} (${animatedSlots} libres)`);
      console.log(`      Permission MANAGE_GUILD_EXPRESSIONS : ${hasPerms ? '✅' : '❌'}`);
      if (!hasPerms) {
        console.log('      💡 Paramètres serveur → Rôles → rôle du bot → "Gérer les expressions"');
        errors++;
      }
      console.log('');
    }

    // ─── Upload pending ─────────────────────────────────────────────────────
    console.log(`📋 Check 5 : Fichiers en attente d'upload`);
    if (pendingFiles.length === 0) {
      console.log('   ✅ Aucun — tout est à jour');
    } else {
      const pendingStatic   = pendingFiles.filter(f => f.endsWith('.png')).length;
      const pendingAnimated = pendingFiles.filter(f => f.endsWith('.gif')).length;
      console.log(`   📊 ${pendingFiles.length} fichier(s) à uploader : ${pendingStatic} PNG · ${pendingAnimated} GIF`);
      console.log(`   📊 Capacité cumulée : ${totalStaticSlots} slots statiques · ${totalAnimatedSlots} slots animés`);
      if (pendingStatic > totalStaticSlots) {
        console.log(`   ⚠️  Pas assez de slots statiques (${pendingStatic} > ${totalStaticSlots})`);
        warnings++;
      }
      if (pendingAnimated > totalAnimatedSlots) {
        console.log(`   ⚠️  Pas assez de slots animés (${pendingAnimated} > ${totalAnimatedSlots})`);
        warnings++;
      }
      for (const f of pendingFiles) console.log(`      • ${f}`);
    }

    // ─── Résumé ─────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    if (errors === 0 && warnings === 0) {
      console.log('✅ TOUT EST BON — lance npm run emojis:upload');
    } else if (errors === 0) {
      console.log(`⚠️  ${warnings} avertissement(s) — upload possible avec réserve.`);
    } else {
      console.log(`❌ ${errors} erreur(s), ⚠️  ${warnings} avertissement(s) — fix d'abord.`);
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
