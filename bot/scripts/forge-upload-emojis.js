'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORGE UPLOAD EMOJIS — ServerForge
 * ═══════════════════════════════════════════════════════════════════════════════
 * Upload les 24 icônes du template ServerForge sur un serveur Discord,
 * puis génère le contenu pour emojis.js.
 *
 * Usage :
 *   node bot/scripts/forge-upload-emojis.js
 *   npm run forge:emojis
 *
 * Requis dans .env :
 *   FORGE_TOKEN=...
 *   EMOJI_GUILD_ID=...      (serveur où uploader — si absent, prend le 1er serveur)
 *
 * Comportement :
 *   1. Connexion au bot ServerForge
 *   2. Upload chaque PNG depuis assets/icons/ comme emoji custom
 *   3. Affiche les IDs + génère le bloc de config pour emojis.js
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../../assets/icons');
const UPLOAD_DELAY = 1500; // 1.5s entre chaque upload (anti-ratelimit)

// Mapping attendu pour les 24 emojis
const EXPECTED = [
  'crown', 'bolt', 'hammer', 'gem', 'check', 'bot',
  'bell', 'chat', 'stats',
  'announce', 'rules', 'welcome', 'music', 'media',
  'log_join', 'log_edit', 'log_mod', 'log_settings', 'log_voice',
  'ui_check', 'ui_cross', 'ui_warning', 'ui_plus', 'ui_minus',
];

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   ServerForge — Upload Emojis       ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  const token = process.env.FORGE_TOKEN;
  const guildOverride = process.env.EMOJI_GUILD_ID;

  if (!token) {
    console.error('❌ FORGE_TOKEN manquant dans .env');
    process.exit(1);
  }

  if (!fs.existsSync(ICONS_DIR)) {
    console.error(`❌ Dossier introuvable : ${ICONS_DIR}`);
    process.exit(1);
  }

  // ── Lire les fichiers disponibles ───────────────────────────────────────
  const files = fs.readdirSync(ICONS_DIR).filter(f => /\.(png|gif)$/i.test(f));
  console.log(`📁 ${files.length} fichiers dans assets/icons/`);

  // Vérifier qu'on a les 24 fichiers attendus
  const missing = EXPECTED.filter(name => !files.some(f => f.startsWith(name)));
  if (missing.length > 0) {
    console.warn(`⚠️  ${missing.length} fichier(s) attendu(s) manquant(s) : ${missing.join(', ')}`);
  }

  // ── Connexion ───────────────────────────────────────────────────────────
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    const ready = new Promise(res => client.once('clientReady', res));
    await client.login(token);
    await ready;
    console.log(`🤖 Connecté : ${client.user.tag}\n`);

  // ── Déterminer le serveur cible ──────────────────────────────────────
  let guild;
  if (guildOverride) {
    try {
      guild = await client.guilds.fetch(guildOverride.trim());
      console.log(`📌 Serveur cible : ${guild.name} (configuré via EMOJI_GUILD_ID)\n`);
    } catch {
      console.warn(`⚠️  Impossible de fetch le serveur ${guildOverride} — utilise le 1er serveur disponible`);
      guild = null;
    }
  }
  if (!guild) {
    // Prendre le premier serveur disponible
    if (client.guilds.cache.size === 0) {
      console.error('❌ Le bot n\'est sur aucun serveur. Invite-le d\'abord.');
      client.destroy();
      process.exit(1);
    }
    guild = client.guilds.cache.first();
    console.log(`📌 Serveur cible : ${guild.name} (premier serveur)\n`);
  }

    // ── Vérifier les permissions ──────────────────────────────────────────
    await guild.members.fetchMe();
    const me = guild.members.me;
    const hasPerms = me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions);
    if (!hasPerms) {
      console.error('❌ Permission MANAGE_GUILD_EXPRESSIONS manquante sur ce serveur.');
      client.destroy();
      process.exit(1);
    }

    await guild.emojis.fetch();
    const staticCount = guild.emojis.cache.filter(e => !e.animated).size;
    console.log(`   Places statiques : ${staticCount}/50 utilisées\n`);

    // ── Upload chaque fichier manquant ────────────────────────────────────
    const results = {};
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const name of EXPECTED) {
      const file = files.find(f => f.startsWith(name));
      if (!file) {
        console.warn(`⚠️  Fichier introuvable pour "${name}" — ignoré`);
        failed++;
        continue;
      }

      const filePath = path.join(ICONS_DIR, file);

      // Vérifier si un emoji avec ce nom existe déjà
      const existing = guild.emojis.cache.find(e => e.name === name);
      if (existing) {
        results[name] = { id: existing.id, guildId: guild.id, animated: false };
        console.log(`⏭️  ${name} → déjà présent (${existing.id})`);
        skipped++;
        continue;
      }

      // Vérifier taille
      const sizeKb = fs.statSync(filePath).size / 1024;
      if (sizeKb > 256) {
        console.error(`❌ ${name} : ${sizeKb.toFixed(0)}KB > 256KB (limite Discord)`);
        failed++;
        continue;
      }

      try {
        const emoji = await guild.emojis.create({
          attachment: filePath,
          name,
        });
        results[name] = { id: emoji.id, guildId: guild.id, animated: false };
        console.log(`✅ ${name} → ${emoji.id}`);
        uploaded++;
        await new Promise(r => setTimeout(r, UPLOAD_DELAY));
      } catch (err) {
        console.error(`❌ ${name} : ${err.message}`);
        failed++;
      }
    }

    // ── Résumé ────────────────────────────────────────────────────────────
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  📊  RÉSULTAT');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Uploadés : ${uploaded}`);
    console.log(`⏭️  Déjà présents : ${skipped}`);
    console.log(`❌ Échoués  : ${failed}`);
    console.log(`📦 Total   : ${Object.keys(results).length} emojis`);
    console.log('');

    // ── Générer la config pour emojis.js ──────────────────────────────────
    console.log('═══  CONFIG POUR EMOJIS.JS  ═══');
    console.log('');
    console.log('Remplace les REMPLACE_PAR_ID par les IDs ci-dessous :');
    console.log('');

    for (const name of EXPECTED) {
      const r = results[name];
      if (r) {
        console.log(`  ${name}: '${r.id}',`);
      } else {
        console.log(`  ${name}: 'REMPLACE_PAR_ID', // ⚠️  NON UPLOADÉ`);
      }
    }

    console.log('');
    console.log(`Guild ID : ${guild.id}`);
    console.log('');

    // ── Optionnel : écrire directement dans emojis.js ─────────────────────
    const confirmation = await askQuestion('➡️  Écrire ces IDs dans bot/config/emojis.js ? (o/N) ');
    if (confirmation.toLowerCase() === 'o' || confirmation.toLowerCase() === 'oui') {
      await updateEmojisJs(results, guild.id);
      console.log('✅ bot/config/emojis.js mis à jour !');
    }

    client.destroy();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erreur fatale :', err.message);
    client.destroy();
    process.exit(1);
  }
}

/**
 * Demande une confirmation à l'utilisateur.
 */
function askQuestion(query) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Met à jour le fichier emojis.js avec les vrais IDs.
 */
async function updateEmojisJs(results, guildId) {
  const emojisPath = path.join(__dirname, '../config/emojis.js');
  if (!fs.existsSync(emojisPath)) {
    console.error(`❌ Fichier introuvable : ${emojisPath}`);
    return;
  }

  let content = fs.readFileSync(emojisPath, 'utf-8');

  for (const [name, data] of Object.entries(results)) {
    // Remplace les REMPLACE_PAR_ID ou les IDs placeholder
    const regex = new RegExp(`(['"])${name}['"]\\s*:\\s*['"](REMPLACE_PAR_ID|\\d{17,20})['"]`, 'g');
    content = content.replace(regex, `'${name}': '${data.id}'`);
  }

  fs.writeFileSync(emojisPath, content, 'utf-8');
  console.log(`📝 ${emojisPath} mis à jour`);
}

main();
