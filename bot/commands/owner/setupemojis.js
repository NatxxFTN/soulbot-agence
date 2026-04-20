'use strict';

const fs   = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
const { setEmojiId, getEmojiId, loadCache, clearCache } = require('../../core/emoji-cache');
const E = require('../../utils/embeds');

const EMOJIS_DIR    = path.join(__dirname, '../../../data/emojis');
const MAX_FILE_SIZE = 256 * 1024; // 256 KB — limite Discord

const EXPECTED = [
  'ui_shield', 'ui_save', 'ui_add_guild', 'ui_search',
  'ui_mod', 'ui_warning', 'ui_check', 'ui_cross',
  'ui_plus', 'ui_minus', 'ui_dev', 'ui_star', 'ui_chat',
];

module.exports = {
  name       : 'setupemojis',
  aliases    : ['setupemoji', 'emojisetup'],
  category   : 'owner',
  description: 'Upload les emojis custom Soulbot sur ce serveur.',
  usage      : ';setupemojis [--force]',
  ownerOnly  : true,
  guildOnly  : true,

  async execute(message, args) {
    // 1. Permissions bot
    const botMember = message.guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return message.reply({
        embeds: [E.error(
          '🔒 Permissions insuffisantes',
          'Le bot a besoin de **"Gérer les emojis et stickers"** sur ce serveur.\n\n' +
          '**Solution :** Paramètres serveur → Rôles → Rôle du bot → active la permission.',
        )],
      });
    }

    // 2. Dossier source
    if (!fs.existsSync(EMOJIS_DIR)) {
      return message.reply({
        embeds: [E.error('📁 Dossier manquant', `Le dossier \`data/emojis/\` est introuvable.`)],
      });
    }

    const force = args.includes('--force');
    if (force) clearCache();

    // 3. Scan
    const files = fs.readdirSync(EMOJIS_DIR).filter(f => /\.(png|gif)$/i.test(f));
    if (!files.length) {
      return message.reply({
        embeds: [E.error('📭 Dossier vide', 'Place tes PNG dans `data/emojis/` puis relance.')],
      });
    }

    const loading = await message.reply({
      embeds: [E.base().setColor(0x3B82F6).setTitle('⏳ Upload en cours…')
        .setDescription(`${files.length} fichier(s) détecté(s). Patiente ~${files.length * 2}s.`)],
    });

    const cache   = loadCache();
    const results = { success: [], skipped: [], failed: [] };

    for (const file of files) {
      const name     = path.basename(file, path.extname(file));
      const fullPath = path.join(EMOJIS_DIR, file);

      try {
        // Taille
        const stat = fs.statSync(fullPath);
        if (stat.size > MAX_FILE_SIZE) {
          results.failed.push({ name, reason: `Trop lourd (${Math.round(stat.size / 1024)} KB > 256 KB)` });
          continue;
        }

        // Déjà en cache et toujours présent ?
        if (cache[name] && !force) {
          const existing = message.guild.emojis.cache.get(cache[name].id);
          if (existing) { results.skipped.push(name); continue; }
        }

        const emoji = await message.guild.emojis.create({
          attachment: fs.readFileSync(fullPath),
          name,
          reason: 'Soulbot — ;setupemojis',
        });

        setEmojiId(name, emoji.id, emoji.animated);
        results.success.push({ name, id: emoji.id });

        // Rate limit Discord : max ~5 emojis/min
        await new Promise(r => setTimeout(r, 2000));

      } catch (err) {
        results.failed.push({ name, reason: err.message });
      }
    }

    // 4. Rapport
    const lines = [];
    if (results.success.length) lines.push(`✅ **${results.success.length} uploadés**\n${results.success.map(e => `• \`${e.name}\``).join('\n')}`);
    if (results.skipped.length) lines.push(`⏭️ **${results.skipped.length} déjà présents**\n${results.skipped.map(n => `• \`${n}\``).join('\n')}`);
    if (results.failed.length)  lines.push(`❌ **${results.failed.length} échoués**\n${results.failed.map(e => `• \`${e.name}\` — ${e.reason}`).join('\n')}`);

    const total   = results.success.length + results.skipped.length;
    const isOk    = results.failed.length === 0;
    const embed   = isOk
      ? E.base().setColor(0x10B981).setTitle('🎨 Setup emojis complet ✓')
      : E.base().setColor(0xF59E0B).setTitle('🎨 Setup emojis terminé (partiel)');

    embed.setDescription(lines.join('\n\n') + (results.failed.length ? '\n\n💡 Pour forcer le re-upload : `;setupemojis --force`' : ''));

    return loading.edit({ embeds: [embed] });
  },
};
