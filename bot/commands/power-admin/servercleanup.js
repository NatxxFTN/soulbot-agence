'use strict';

const { ChannelType } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'servercleanup',
  aliases    : ['cleanup', 'serverclean'],
  description: 'Détecte les éléments inactifs du serveur (audit, sans suppression).',
  usage      : ';servercleanup',
  cooldown   : 60,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message) {
    const guild = message.guild;
    const status = await message.reply({ embeds: [E.info('Cleanup audit', 'Analyse en cours...')] });

    const now = Date.now();
    const THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30j

    // Catégories vides
    const emptyCategories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory && c.children.cache.size === 0);

    // Salons textuels sans message récent
    const oldChannels = [];
    for (const ch of guild.channels.cache.values()) {
      if (ch.type !== ChannelType.GuildText) continue;
      try {
        const msgs = await ch.messages.fetch({ limit: 1 });
        const last = msgs.first();
        if (!last) {
          oldChannels.push({ ch, since: 'jamais' });
        } else if (now - last.createdTimestamp > THRESHOLD) {
          const days = Math.floor((now - last.createdTimestamp) / 86400000);
          oldChannels.push({ ch, since: `${days}j` });
        }
      } catch { /* perms */ }
      if (oldChannels.length >= 50) break;
    }

    // Rôles non assignés (hors @everyone, managed)
    const unusedRoles = guild.roles.cache.filter(r => !r.managed && r.id !== guild.id && r.members.size === 0);

    // Webhooks
    let webhookCount = 0;
    try {
      const hooks = await guild.fetchWebhooks();
      webhookCount = hooks.size;
    } catch { /* perms */ }

    return status.edit({
      embeds: [
        E.base()
          .setTitle('🧹 Cleanup audit')
          .setDescription(`Audit du serveur **${guild.name}** — éléments potentiellement inactifs (suppression manuelle).`)
          .addFields(
            { name: '📂 Catégories vides',   value: emptyCategories.size > 0 ? Array.from(emptyCategories.values()).map(c => `\`${c.name}\``).slice(0, 10).join(', ') : '_aucune_', inline: false },
            { name: '💬 Salons inactifs >30j', value: oldChannels.length > 0 ? oldChannels.slice(0, 10).map(o => `<#${o.ch.id}> _(${o.since})_`).join('\n') : '_aucun_', inline: false },
            { name: '🎭 Rôles non assignés',   value: unusedRoles.size > 0 ? Array.from(unusedRoles.values()).slice(0, 10).map(r => `<@&${r.id}>`).join(', ') : '_aucun_', inline: false },
            { name: '🪝 Webhooks',             value: `${webhookCount} total (vérifier manuellement les inactifs)`, inline: false },
          )
          .setFooter({ text: 'Suppression manuelle requise — aucune action automatique' }),
      ],
    });
  },
};
