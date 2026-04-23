'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/serverbackup-storage');
const { createBackup } = require('../../core/serverbackup-scheduler');

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

module.exports = {
  name       : 'serverbackup',
  aliases    : ['sback'],
  category   : 'owner',
  description: 'Sauvegardes automatiques du serveur (;serverbackup on|off|now).',
  usage      : ';serverbackup <on|off|now|status>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const sub = (args[0] || 'status').toLowerCase();
    const cfg = storage.getConfig(message.guild.id) || {};

    if (sub === 'on') {
      storage.setConfig(message.guild.id, { enabled: 1 });
      return plain(message, `${e('btn_success')} Sauvegardes automatiques **activées**. Configure via \`;serverbackupconfig\`.`);
    }

    if (sub === 'off') {
      storage.setConfig(message.guild.id, { enabled: 0 });
      return plain(message, `${e('btn_success')} Sauvegardes automatiques **désactivées**.`);
    }

    if (sub === 'now') {
      const wait = await plain(message, `${e('ani_loading')} Création d'un snapshot...`);
      const freshCfg = storage.getConfig(message.guild.id) || { max_backups: 5, include_members: 0 };
      const res = await createBackup(message.guild, freshCfg, false);
      if (!res) return plain(message, `${e('btn_error')} Échec du backup.`);
      const content =
        `${e('btn_success')} **Backup créé** · \`${res.name}\`\n` +
        `${res.channels} salons · ${res.roles} rôles · ${(res.size / 1024).toFixed(1)} KB`;
      if (wait && wait.edit) {
        const ct = new ContainerBuilder().setAccentColor(0xFF0000);
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
        return wait.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
      return plain(message, content);
    }

    // status par défaut
    const last = cfg.last_backup_at ? `<t:${Math.floor(cfg.last_backup_at / 1000)}:R>` : 'jamais';
    const enabledTxt = cfg.enabled ? `${e('btn_success')} activé` : `${e('btn_error')} désactivé`;
    return plain(message,
      `${e('cat_owner')} **ServerBackup**\n` +
      `**État** · ${enabledTxt}\n` +
      `**Intervalle** · ${cfg.interval_days || 7} jour(s)\n` +
      `**Snapshots max** · ${cfg.max_backups || 5}\n` +
      `**Dernier backup** · ${last}\n\n` +
      `Config complète : \`;serverbackupconfig\``,
    );
  },
};
