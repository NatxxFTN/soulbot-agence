'use strict';

const { restoreGuild } = require('../../core/freeze-scheduler');
const storage = require('../../core/freeze-storage');
const { LEVELS } = require('../../core/permissions-levels');
const { getUserLevel } = require('../../core/permissions');
const { e } = require('../../core/emojis');
const {
  newContainer, buildHeader, text, toV2Payload, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name        : 'unfreeze',
  aliases     : ['unpanic', 'unlockall'],
  description : 'Dégèle le serveur et restaure les permissions snapshotées',
  usage       : ';unfreeze',
  guildOnly   : true,

  async execute(message, args, client) {
    const level = getUserLevel(message.author.id, message.guild.id);
    if (level < LEVELS.OWNER) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Accès refusé',
        description: '`;unfreeze` est réservé aux **Owners** (niveau 100).',
        category: 'Innovation',
      })));
    }

    const current = storage.getFreeze(message.guild.id);
    if (!current) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Pas de gel actif',
        description: 'Le serveur n\'est pas gelé — rien à restaurer.',
        category: 'Innovation',
      })));
    }

    await message.channel.sendTyping().catch(() => {});

    try {
      await restoreGuild(client, message.guild.id);

      const duration = current.frozen_at
        ? Math.round((Date.now() - current.frozen_at) / 1000)
        : 0;
      const durLabel = duration > 60 ? `${Math.floor(duration / 60)} min ${duration % 60}s` : `${duration}s`;

      const container = newContainer();
      buildHeader(container, {
        emojiKey : 'ui_unlock',
        title    : '🔥 Serveur DÉGELÉ',
        subtitle : `Par **${message.author.tag}** · <t:${Math.floor(Date.now() / 1000)}:F>`,
      });

      container.addTextDisplayComponents(
        text(
          `## Restauration effectuée\n` +
          `• ${e('btn_success') || '✅'} Permissions restaurées depuis le snapshot\n` +
          `• 🕒 **Durée du gel :** ${durLabel}\n` +
          (current.reason ? `• 📝 **Raison initiale :** ${current.reason}\n` : ''),
        ),
      );

      container.addTextDisplayComponents(text(`-# Soulbot • Innovation • Panic v1.0`));

      return message.reply(toV2Payload(container));
    } catch (err) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Erreur pendant le dégel',
        description: err.message,
        category: 'Innovation',
      })));
    }
  },
};
