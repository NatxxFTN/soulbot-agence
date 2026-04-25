'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { e } = require('../../core/emojis');
const {
  newContainer, buildHeader, separator, text, toV2Payload, successEmbed, errorEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

const SAFE_PREFIXES = ['keep_', 'perm_', 'cat_', 'ani_', 'btn_', 'ui_'];

const EMOJI_RE = /<a?:([a-zA-Z0-9_]+):(\d+)>/g;

function isSafeName(name) {
  const n = String(name).toLowerCase();
  return SAFE_PREFIXES.some(p => n.startsWith(p));
}

// Cache simple par guilde : { guildId: { ids: string[], at: number } }
const PENDING = new Map();

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scanUsedEmojis(guild) {
  const used = new Set();
  const textChannels = guild.channels.cache.filter(c =>
    [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(c.type),
  );

  let scanned = 0;
  for (const ch of textChannels.values()) {
    try {
      const me = guild.members.me;
      if (!me) break;
      if (!ch.permissionsFor(me)?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory])) continue;

      const msgs = await ch.messages.fetch({ limit: 100 }).catch(() => null);
      if (!msgs) continue;
      for (const m of msgs.values()) {
        const matches = m.content?.matchAll?.(EMOJI_RE);
        if (matches) for (const match of matches) used.add(match[2]);
        for (const r of m.reactions.cache.values()) {
          if (r.emoji.id) used.add(r.emoji.id);
        }
      }
      scanned++;
      if (scanned >= 30) break;
      await sleep(150);
    } catch { /* skip */ }
  }
  return used;
}

module.exports = {
  name        : 'purgeemojis',
  aliases     : ['purgeemoji', 'emojipurge'],
  description : 'Détecte et supprime les emojis custom non utilisés (safeguard sur préfixes)',
  usage       : ';purgeemojis [confirm <token>]',
  guildOnly   : true,
  permissions : ['ManageGuildExpressions'],

  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();

    // Étape 2 : confirmation avec token
    if (sub === 'confirm') {
      const pending = PENDING.get(message.guild.id);
      if (!pending) {
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Aucune purge préparée',
          description: 'Relance `;purgeemojis` pour lancer un nouveau scan.',
          category: 'Innovation',
        })));
      }
      if (Date.now() - pending.at > 5 * 60 * 1000) {
        PENDING.delete(message.guild.id);
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Confirmation expirée',
          description: 'Le token a expiré (5 min). Relance `;purgeemojis`.',
          category: 'Innovation',
        })));
      }
      if (args[1] !== pending.token) {
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Token invalide',
          description: 'Copie le token depuis la preview du scan.',
          category: 'Innovation',
        })));
      }

      await message.channel.sendTyping().catch(() => {});

      let ok = 0, failed = 0;
      for (const id of pending.ids) {
        const emo = message.guild.emojis.cache.get(id);
        if (!emo) { failed++; continue; }
        try {
          await emo.delete(`[purgeemojis] par ${message.author.tag}`);
          ok++;
          await sleep(500);
        } catch { failed++; }
      }
      PENDING.delete(message.guild.id);

      return message.reply(toEmbedReply(successEmbed({
        title       : 'Purge terminée',
        description : `**${ok}** emoji(s) supprimé(s) · **${failed}** échec(s).`,
        user        : message.author,
        category    : 'Innovation',
      })));
    }

    // Étape 1 : scan + preview
    await message.channel.sendTyping().catch(() => {});

    const used = await scanUsedEmojis(message.guild);
    const candidates = [...message.guild.emojis.cache.values()].filter(em =>
      !used.has(em.id) && !isSafeName(em.name) && !em.managed,
    );

    if (candidates.length === 0) {
      return message.reply(toEmbedReply(successEmbed({
        title       : 'Aucun emoji à purger',
        description : 'Tous les emojis custom sont utilisés ou protégés par safeguard.',
        user        : message.author,
        category    : 'Innovation',
      })));
    }

    const token = Math.random().toString(36).slice(2, 8);
    PENDING.set(message.guild.id, { ids: candidates.map(c => c.id), token, at: Date.now() });

    // Panel V2 preview
    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'btn_trash',
      title    : 'Purge d\'emojis — Preview',
      subtitle : `**${candidates.length}** emoji(s) candidat(s) à la suppression`,
    });

    container.addTextDisplayComponents(
      text(`> ⚠️ **Action destructive.** La suppression est définitive et non réversible.`),
    );
    container.addSeparatorComponents(separator('Small'));

    const preview = candidates.slice(0, 15).map(c => `• \`${c.name}\` <${c.animated ? 'a' : ''}:${c.name}:${c.id}>`).join('\n');
    const more = candidates.length > 15 ? `\n*… et ${candidates.length - 15} autres*` : '';

    container.addTextDisplayComponents(text(`## Candidats\n${preview}${more}`));
    container.addSeparatorComponents(separator('Small'));

    container.addTextDisplayComponents(
      text(
        `## Safeguards actifs\nPréfixes ignorés : \`${SAFE_PREFIXES.join('`, `')}\`\n` +
        `*(Ces emojis, même inutilisés, ne seront pas touchés.)*`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    container.addTextDisplayComponents(
      text(
        `## Pour confirmer\n\`\`\`\n;purgeemojis confirm ${token}\n\`\`\`\n*Expire dans 5 min.*`,
      ),
    );

    container.addTextDisplayComponents(text(`-# Soulbot • Innovation • Emoji Purge v1.0`));

    return message.reply(toV2Payload(container));
  },
};
