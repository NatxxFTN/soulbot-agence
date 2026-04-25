'use strict';

const { ChannelType } = require('discord.js');
const storage = require('../../core/freeze-storage');
const { parseDelay } = require('../../core/schedule-storage');
const { LEVELS } = require('../../core/permissions-levels');
const { getUserLevel } = require('../../core/permissions');
const { e } = require('../../core/emojis');
const {
  newContainer, buildHeader, separator, text, toV2Payload, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name        : 'freeze',
  aliases     : ['panic', 'lockall'],
  description : 'Gèle le serveur : retire SendMessages à @everyone sur tous les salons texte',
  usage       : ';freeze [durée] [raison]',
  guildOnly   : true,

  async execute(message, args) {
    const level = getUserLevel(message.author.id, message.guild.id);
    if (level < LEVELS.OWNER) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Accès refusé',
        description: '`;freeze` est réservé aux **Owners** (niveau 100).',
        category: 'Innovation',
      })));
    }

    if (storage.getFreeze(message.guild.id)) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Déjà gelé',
        description: 'Le serveur est actuellement gelé. Utilise `;unfreeze` pour le dégeler.',
        category: 'Innovation',
      })));
    }

    let durMs = null;
    let reason = '';
    if (args.length) {
      const maybeDelay = parseDelay(args[0]);
      if (maybeDelay) {
        durMs = maybeDelay;
        reason = args.slice(1).join(' ').trim();
      } else {
        reason = args.join(' ').trim();
      }
    }

    const expiresAt = durMs ? Date.now() + durMs : null;
    const everyoneId = message.guild.roles.everyone.id;

    await message.channel.sendTyping().catch(() => {});

    let ok = 0, skipped = 0, failed = 0;
    for (const ch of message.guild.channels.cache.values()) {
      if (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement) continue;
      try {
        const current = ch.permissionOverwrites.cache.get(everyoneId);
        const allowBits = current?.allow?.bitfield?.toString() || '0';
        const denyBits  = current?.deny?.bitfield?.toString()  || '0';
        storage.saveSnapshot(message.guild.id, ch.id, allowBits, denyBits, current ? 1 : 0);

        await ch.permissionOverwrites.edit(everyoneId, {
          SendMessages: false,
        }, { reason: `[freeze] ${message.author.tag}${reason ? ' — ' + reason : ''}` });
        ok++;
      } catch (err) {
        if (err.message?.includes('Missing Permissions')) skipped++;
        else failed++;
      }
    }

    storage.createFreeze(message.guild.id, message.author.id, expiresAt, reason || null);

    // Panel V2 résultat
    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'ui_lock',
      title    : `🧊 Serveur GELÉ`,
      subtitle : `Par **${message.author.tag}** · <t:${Math.floor(Date.now() / 1000)}:F>`,
    });

    container.addTextDisplayComponents(
      text(
        `## Rapport\n` +
        `• ${e('btn_success') || '✅'} **Salons verrouillés :** ${ok}\n` +
        (skipped ? `• ⚠️ **Skippés (perm manquante) :** ${skipped}\n` : '') +
        (failed  ? `• 🔴 **Échecs :** ${failed}\n` : '') +
        (reason  ? `• 📝 **Raison :** ${reason}\n` : ''),
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    const expiryLine = expiresAt
      ? `🕒 **Auto-dégel :** <t:${Math.floor(expiresAt / 1000)}:R>`
      : `🔒 **Auto-dégel :** *manuel uniquement* (\`;unfreeze\`)`;
    container.addTextDisplayComponents(text(`## Expiration\n${expiryLine}`));

    container.addTextDisplayComponents(text(`-# Soulbot • Innovation • Panic v1.0`));

    return message.reply(toV2Payload(container));
  },
};
