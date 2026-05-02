'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// ;logsstatus — Vue compacte du système Logs V3
// ═══════════════════════════════════════════════════════════════════════════

const V3 = require('../../core/logs-v3-helper');
const { infoEmbed, toEmbedReply } = require('../../ui/panels/_premium-helpers');

module.exports = {
  name       : 'logsstatus',
  aliases    : ['logstate'],
  description: 'Vue compacte du système de logs V3 (enabled, default, events actifs, dernier event)',
  usage      : ';logsstatus',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message) {
    const guild = message.guild;
    const cfg = V3.getConfig(guild.id);

    const totalEvents = Object.keys(V3.EVENT_TYPES).length;
    const activeEvents = Object.keys(V3.EVENT_TYPES).filter(t => V3.isEventEnabled(guild.id, t)).length;
    const stats = V3.getStatsToday(guild.id);
    const ring  = V3.getRingBuffer(guild.id, 1);
    const last  = ring[0];

    const lastLine = last
      ? `<t:${Math.floor(last.ts / 1000)}:R> · **${V3.EVENT_TYPES[last.type]?.label || last.type}**`
      : '*aucun event en buffer*';

    return message.reply(toEmbedReply(infoEmbed({
      title       : `Logs V3 — Status ${guild.name}`,
      description :
        `**Global :** ${cfg.global_enabled ? '🟢 Actif' : '🔴 Désactivé'} · Version **${cfg.version}**\n` +
        `**Salon par défaut :** ${cfg.default_channel_id ? `<#${cfg.default_channel_id}>` : '*non configuré*'}\n` +
        `**Catégorie :** ${cfg.category_id ? `<#${cfg.category_id}>` : '*non configurée*'}\n` +
        `**Thème :** \`${cfg.theme}\``,
      fields      : [
        { name: '📊 Events actifs',      value: `**${activeEvents}** / ${totalEvents}`, inline: true },
        { name: '📈 Events 24h',         value: `**${stats.total}**`,                   inline: true },
        { name: '🎯 Top aujourd\'hui',  value: stats.topEvents[0]
          ? `${V3.EVENT_TYPES[stats.topEvents[0].event_type]?.icon || '•'} ${V3.EVENT_TYPES[stats.topEvents[0].event_type]?.label || stats.topEvents[0].event_type} × ${stats.topEvents[0].count}`
          : '*aucun*', inline: true },
        { name: '⏱ Dernier event',      value: lastLine,                                inline: false },
      ],
      category    : 'Logs V3',
    })));
  },
};
