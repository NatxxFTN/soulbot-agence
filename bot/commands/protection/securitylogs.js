'use strict';

const {
  PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');
const { FEATURE_LABELS } = require('../../core/security-punishments');

module.exports = {
  name       : 'securitylogs',
  aliases    : ['seclog', 'securitylog', 'seclogs'],
  category   : 'protection',
  description: 'Affiche les logs sécurité récents (filtrable par feature).',
  usage      : ';securitylogs [feature] [limit]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} Permission requise : **Gérer le serveur**.`));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const feature = (args[0] || '').toLowerCase();
    const limit   = Math.min(50, Math.max(1, parseInt(args[1], 10) || 15));

    const logs = feature
      ? storage.getLogsByFeature(message.guild.id, feature, limit)
      : storage.getRecentLogs(message.guild.id, limit);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ui_pin')} **Logs sécurité** · ${logs.length} entrée(s)` +
      (feature ? ` · filtre : \`${feature}\`` : ''),
    ));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (logs.length === 0) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_tip')} Aucun log${feature ? ` pour \`${feature}\`` : ''}.`,
      ));
    } else {
      const lines = logs.map(l => {
        const label = FEATURE_LABELS[l.feature] || l.feature;
        return `• <t:${Math.floor(l.triggered_at / 1000)}:R> · <@${l.user_id}> · **${label}** → \`${l.action_taken}\``;
      });
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_tip')} Filtrer : \`;securitylogs <feature> [limit]\` — ex: \`;securitylogs antilink 20\``,
    ));

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
