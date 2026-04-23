'use strict';

/**
 * ═══════════════════════════════════════════════
 * UPLOAD EMOJIS — Soulbot (multi-serveur)
 * ═══════════════════════════════════════════════
 * Usage : node bot/scripts/upload-emojis.js
 *         npm run emojis:upload
 *
 * Requis dans .env :
 *   DISCORD_TOKEN=...
 *   EMOJI_GUILD_ID=...       (serveur principal)
 *   EMOJI_GUILD_ID_2=...     (optionnel — overflow)
 *   EMOJI_GUILD_ID_3=...     (optionnel — overflow)
 *   EMOJI_GUILD_ID_4=...     (optionnel — overflow)
 *
 * Comportement :
 *   1. Fetch chaque serveur emoji configuré
 *   2. Migration rétroactive : ajoute guildId aux emojis existants
 *   3. Pour chaque nouveau fichier, upload sur le serveur avec le
 *      plus de places disponibles (statiques ou animés selon le type)
 *   4. Écrit data/emojis-ids.json avec le champ guildId
 * ═══════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { loadCache, saveCache } = require('../core/emoji-cache');

const EMOJIS_DIR   = path.join(__dirname, '../assets/emojis');
const UPLOAD_DELAY = 1500;

// Limites Discord standard (tier 0). Les tiers boostés ont 100/150/250.
const LIMIT_STATIC   = 50;
const LIMIT_ANIMATED = 50;

function getConfiguredGuildIds() {
  return [
    process.env.EMOJI_GUILD_ID,
    process.env.EMOJI_GUILD_ID_2,
    process.env.EMOJI_GUILD_ID_3,
    process.env.EMOJI_GUILD_ID_4,
  ].filter(Boolean).map(id => id.trim().replace(/['"]/g, ''));
}

function validateId(id) {
  return /^\d{17,20}$/.test(id);
}

async function fetchGuildWithEmojis(client, guildId) {
  const guild = await client.guilds.fetch(guildId);
  await guild.emojis.fetch();

  const me = await guild.members.fetchMe();
  const hasPerms = me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)
                || me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);

  return { guild, hasPerms };
}

function countEmojis(guild) {
  const staticCount   = guild.emojis.cache.filter(em => !em.animated).size;
  const animatedCount = guild.emojis.cache.filter(em =>  em.animated).size;
  return { staticCount, animatedCount };
}

function pickBestGuild(guilds, isAnimated) {
  let best = null;
  let bestSlots = 0;
  for (const g of guilds) {
    const { staticCount, animatedCount } = countEmojis(g.guild);
    const used  = isAnimated ? animatedCount : staticCount;
    const limit = isAnimated ? LIMIT_ANIMATED : LIMIT_STATIC;
    const slots = limit - used;
    if (slots > bestSlots) {
      bestSlots = slots;
      best = g;
    }
  }
  return { best, slots: bestSlots };
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  📤  UPLOAD EMOJIS SOULBOT (MULTI-SERVEUR)');
  console.log('═══════════════════════════════════════════\n');

  const token    = process.env.DISCORD_TOKEN;
  const guildIds = getConfiguredGuildIds();

  if (!token) {
    console.error('❌ DISCORD_TOKEN manquant dans .env');
    process.exit(1);
  }
  if (guildIds.length === 0) {
    console.error('❌ Aucune variable EMOJI_GUILD_ID définie dans .env');
    process.exit(1);
  }

  for (const id of guildIds) {
    if (!validateId(id)) {
      console.error(`❌ ID invalide : "${id}" (attendu : 17-20 chiffres)`);
      process.exit(1);
    }
  }

  console.log(`🔧 ${guildIds.length} serveur(s) configuré(s) : ${guildIds.map(id => `***${id.slice(-4)}`).join(', ')}\n`);

  if (!fs.existsSync(EMOJIS_DIR)) {
    console.error(`❌ Dossier introuvable : ${EMOJIS_DIR}`);
    process.exit(1);
  }

  const files    = fs.readdirSync(EMOJIS_DIR).filter(f => /\.(png|gif)$/i.test(f));
  const pngCount = files.filter(f => f.endsWith('.png')).length;
  const gifCount = files.filter(f => f.endsWith('.gif')).length;

  console.log(`📁 Fichiers détectés : ${files.length} (${pngCount} PNG · ${gifCount} GIF)\n`);

  // ── Connexion Discord ───────────────────────────────────────────────────────
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    const ready = new Promise(res => client.once('clientReady', res));
    await client.login(token);
    await ready;
    console.log(`🤖 Connecté : ${client.user.tag}\n`);

    // ── Fetch chaque serveur ────────────────────────────────────────────────
    const guilds = [];
    for (const id of guildIds) {
      try {
        const res = await fetchGuildWithEmojis(client, id);
        if (!res.hasPerms) {
          console.error(`⚠️  ${res.guild.name} : permission MANAGE_GUILD_EXPRESSIONS manquante — serveur ignoré`);
          continue;
        }
        guilds.push(res);
        const { staticCount, animatedCount } = countEmojis(res.guild);
        console.log(`✓ ${res.guild.name} (***${id.slice(-4)}) — ${staticCount}/${LIMIT_STATIC} stat · ${animatedCount}/${LIMIT_ANIMATED} ani`);
      } catch (err) {
        console.error(`✗ Serveur ***${id.slice(-4)} inaccessible : ${err.message}`);
      }
    }

    if (guilds.length === 0) {
      console.error('\n❌ Aucun serveur emoji exploitable. STOP.');
      client.destroy();
      process.exit(1);
    }
    console.log('');

    // ── Charger cache local ─────────────────────────────────────────────────
    const cache = loadCache();

    // ── MIGRATION : ajouter guildId aux entrées existantes sans ce champ ───
    let migrated = 0;
    for (const [name, data] of Object.entries(cache)) {
      if (!data.guildId && data.id) {
        for (const { guild } of guilds) {
          if (guild.emojis.cache.has(data.id)) {
            data.guildId = guild.id;
            migrated++;
            break;
          }
        }
        if (!data.guildId) {
          // L'emoji a un ID mais n'est plus présent sur aucun serveur configuré
          // → fallback sur le 1er serveur (legacy, mais flag-able)
          data.guildId = guilds[0].guild.id;
        }
      }
    }
    if (migrated > 0) {
      console.log(`🔄 Migration : ${migrated} emoji(s) ont reçu leur guildId\n`);
      saveCache(cache);
    }

    // ── Détecter les nouveaux ───────────────────────────────────────────────
    const toUpload = [];
    for (const file of files) {
      const name     = file.replace(/\.(png|gif)$/i, '');
      const animated = file.toLowerCase().endsWith('.gif');
      if (!cache[name]) toUpload.push({ file, name, animated });
    }

    if (toUpload.length === 0) {
      console.log('ℹ️  Aucun nouvel emoji à uploader.\n');
      printSummary(guilds, { uploaded: 0, failed: 0, migrated });
      client.destroy();
      process.exit(0);
    }

    console.log(`🎯 ${toUpload.length} nouvel(s) emoji(s) à uploader\n`);
    console.log('─── UPLOAD ─────────────────────────────────\n');

    // ── Upload effectif ─────────────────────────────────────────────────────
    let uploaded = 0;
    let failed   = 0;

    for (const item of toUpload) {
      const filePath = path.join(EMOJIS_DIR, item.file);
      const sizeKb   = fs.statSync(filePath).size / 1024;

      if (sizeKb > 256) {
        console.warn(`⚠️  ${item.name} : ${sizeKb.toFixed(0)}KB > 256KB (limite Discord) — ignoré`);
        failed++;
        continue;
      }

      const { best, slots } = pickBestGuild(guilds, item.animated);
      if (!best || slots === 0) {
        const type = item.animated ? 'animés' : 'statiques';
        console.error(`❌ ${item.name} : tous les serveurs sont pleins (${type})`);
        failed++;
        continue;
      }

      try {
        const emoji = await best.guild.emojis.create({
          attachment: filePath,
          name      : item.name,
        });

        cache[item.name] = {
          id        : emoji.id,
          animated  : emoji.animated,
          guildId   : best.guild.id,
          updated_at: Date.now(),
        };
        saveCache(cache);

        // Mettre à jour le cache local du guild pour le prochain pickBestGuild
        best.guild.emojis.cache.set(emoji.id, emoji);

        const icon = item.animated ? '🎬' : '🖼️';
        console.log(`✅ ${icon} ${item.name} → ${best.guild.name} (${emoji.id})`);
        uploaded++;

        await new Promise(r => setTimeout(r, UPLOAD_DELAY));
      } catch (err) {
        console.error(`❌ ${item.name} : ${err.message}`);
        failed++;
      }
    }

    console.log('');
    printSummary(guilds, { uploaded, failed, migrated });
    client.destroy();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erreur fatale :', err.message);
    client.destroy();
    process.exit(1);
  }
}

function printSummary(guilds, { uploaded, failed, migrated }) {
  const total = Object.keys(loadCache()).length;

  console.log('═══════════════════════════════════════════');
  console.log('  📊  RÉSUMÉ');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Uploadés    : ${uploaded}`);
  console.log(`❌ Échoués     : ${failed}`);
  console.log(`🔄 Migrés      : ${migrated}`);
  console.log(`📦 Total cache : ${total} emojis`);
  console.log('');
  for (const { guild } of guilds) {
    const { staticCount, animatedCount } = countEmojis(guild);
    console.log(`🖥️  ${guild.name} : ${staticCount}/${LIMIT_STATIC} stat · ${animatedCount}/${LIMIT_ANIMATED} ani`);
  }
  console.log('═══════════════════════════════════════════\n');
}

main();
