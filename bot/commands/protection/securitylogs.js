'use strict';

// ── ;securitylogs — panel Logs V4 filtrable + paginé + export CSV ─────────────
// Refonte v2.1.2 : filtres dynamiques par module et gravité, navigation,
// export CSV. Rendu centralisé dans bot/utils/logs-renderer.js.

const { PermissionFlagsBits, AttachmentBuilder, MessageFlags } = require('discord.js');
const { errorEmbed } = require('../../utils/response-builder');
const storage = require('../../core/security-storage');
const { renderLogsPanel, logsToCsv } = require('../../utils/logs-renderer');

module.exports = {
  name       : 'securitylogs',
  aliases    : ['seclog', 'securitylog', 'seclogs'],
  category   : 'protection',
  description: 'Panel Logs V4 : filtres par module/gravité, pagination, export CSV.',
  usage      : ';securitylogs [feature]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [errorEmbed('Accès refusé', 'Permission **Gérer le serveur** requise.')] });
    }

    const state = {
      page: 1,
      filterFeature: (args[0] || '').toLowerCase() || null,
      filterSeverity: null,
    };

    let logs = storage.getRecentLogs(message.guild.id, 200);
    const panel = renderLogsPanel(logs, state);
    const reply = await message.reply({
      embeds: panel.embeds, components: panel.components,
      allowedMentions: { repliedUser: false, parse: [] },
    });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300_000,
    });

    collector.on('collect', async (i) => {
      const [ns, action, param] = i.customId.split(':');
      if (ns !== 'seclogs') return;

      if (action === 'feature') {
        state.filterFeature = i.values[0] === 'all' ? null : i.values[0];
        state.page = 1;
      } else if (action === 'severity') {
        state.filterSeverity = i.values[0] === 'all' ? null : i.values[0];
        state.page = 1;
      } else if (action === 'page') {
        state.page = parseInt(param, 10) || 1;
      } else if (action === 'refresh') {
        logs = storage.getRecentLogs(message.guild.id, 200);
      } else if (action === 'export') {
        const { filtered } = renderLogsPanel(logs, state);
        return i.reply({
          files: [new AttachmentBuilder(
            Buffer.from(logsToCsv(filtered), 'utf8'),
            { name: `soulbot-seclogs-${message.guild.id}-${Date.now()}.csv` },
          )],
          flags: MessageFlags.Ephemeral,
        });
      }

      const updated = renderLogsPanel(logs, state);
      await i.update({ embeds: updated.embeds, components: updated.components });
    });

    collector.on('end', () => {
      reply.edit({ components: [] }).catch(() => {});
    });
  },
};
