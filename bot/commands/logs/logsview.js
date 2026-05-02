'use strict';

const V3 = require('../../core/logs-v3-helper');
const {
  newContainer, buildHeader, separator, text, toV2Payload, infoEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name       : 'logsview',
  aliases    : ['viewlogs', 'recentlogs', 'logslast'],
  description: 'Afficher les 20 derniers logs émis depuis le redémarrage du bot.',
  usage      : ';logsview',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message) {
    const buffer = V3.getRingBuffer(message.guild.id, 20);

    if (!buffer.length) {
      return message.reply(toEmbedReply(infoEmbed({
        title: 'Aucun log récent',
        description:
          'Le buffer est vide (ou le bot vient de redémarrer).\n\n' +
          '*Les logs sont conservés en mémoire uniquement — 50 derniers max, 20 affichés.*',
        category: 'Logs V3',
      })));
    }

    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'ui_folder',
      title    : `Logs récents`,
      subtitle : `**${buffer.length}/20** derniers événements en mémoire`,
    });

    const byType = new Map();
    for (const entry of buffer) byType.set(entry.type, (byType.get(entry.type) || 0) + 1);
    const topTypes = [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, n]) => `\`${t}\` ×${n}`)
      .join(' · ');
    if (topTypes) {
      container.addTextDisplayComponents(text(`## Top events\n${topTypes}`));
      container.addSeparatorComponents(separator('Small'));
    }

    const lines = buffer.map((entry, i) => {
      const secs = Math.floor(entry.ts / 1000);
      const meta = V3.EVENT_TYPES[entry.type];
      const label = meta ? `${meta.icon} ${meta.label}` : entry.type;
      return `\`${String(i + 1).padStart(2, '0')}.\` <t:${secs}:R> · **${label}**\n     └ ${(entry.summary || '').slice(0, 140)}`;
    });

    const chunkSize = 8;
    for (let i = 0; i < lines.length; i += chunkSize) {
      container.addTextDisplayComponents(text(lines.slice(i, i + chunkSize).join('\n\n')));
    }

    container.addTextDisplayComponents(text(`-# Soulbot · Logs V3 · Ring buffer mémoire`));

    return message.reply(toV2Payload(container));
  },
};
