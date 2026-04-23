'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/serverbackup-storage');

module.exports = {
  name       : 'serverbackuplist',
  aliases    : ['sbacklist'],
  category   : 'owner',
  description: 'Liste les snapshots de sauvegarde du serveur.',
  usage      : ';serverbackuplist',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, _args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} Permission requise.`,
      ));
      return message.reply({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false },
      }).catch(() => {});
    }

    const snapshots = storage.listSnapshots(message.guild.id);
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ui_folder')} **Snapshots du serveur** · ${snapshots.length}`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (snapshots.length === 0) {
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Aucun snapshot. Crée-en un avec \`;serverbackup now\`.`,
      ));
    } else {
      const lines = snapshots.slice(0, 15).map(s => {
        const t = Math.floor(s.created_at / 1000);
        const kb = (s.size_bytes / 1024).toFixed(1);
        const tag = s.auto ? '🤖' : '👤';
        return `**#${s.id}** ${tag} \`${s.name}\` · <t:${t}:R> · ${kb} KB · ${s.channels_count} salons · ${s.roles_count} rôles`;
      });
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    }

    return message.reply({
      components: [ct],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
