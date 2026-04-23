'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelSelectMenuBuilder, StringSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/serverbackup-storage');

function buildPanel(guild) {
  const cfg = storage.getConfig(guild.id) || {};
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_owner')} **Configuration · Sauvegardes serveur**`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const enabledTxt = cfg.enabled ? `${e('btn_success')} activé` : `${e('btn_error')} désactivé`;
  const notify = cfg.notify_channel ? `<#${cfg.notify_channel}>` : '*(aucun)*';
  const members = cfg.include_members ? `${e('btn_success')} oui` : `${e('btn_error')} non`;
  const last = cfg.last_backup_at ? `<t:${Math.floor(cfg.last_backup_at / 1000)}:R>` : 'jamais';

  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `**État** · ${enabledTxt}\n` +
    `**Intervalle** · ${cfg.interval_days || 7} jour(s)\n` +
    `**Snapshots max** · ${cfg.max_backups || 5}\n` +
    `**Inclure membres** · ${members}\n` +
    `**Salon de notif.** · ${notify}\n` +
    `**Dernier backup** · ${last}`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const intervalSel = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('sbackcfg:set_interval')
      .setPlaceholder('Intervalle entre backups')
      .addOptions(
        { label: 'Tous les jours',     value: '1' },
        { label: 'Tous les 3 jours',   value: '3' },
        { label: 'Toutes les semaines', value: '7' },
        { label: 'Toutes les 2 sem.',   value: '14' },
        { label: 'Tous les mois',       value: '30' },
      ),
  );
  const maxSel = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('sbackcfg:set_max')
      .setPlaceholder('Nombre maximum de snapshots')
      .addOptions(
        { label: '3 snapshots',  value: '3'  },
        { label: '5 snapshots',  value: '5'  },
        { label: '10 snapshots', value: '10' },
      ),
  );
  const chSel = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('sbackcfg:set_notify')
      .setPlaceholder('Salon de notification (optionnel)')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(0).setMaxValues(1),
  );
  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sbackcfg:toggle_enabled')
      .setLabel(cfg.enabled ? 'Désactiver' : 'Activer')
      .setStyle(cfg.enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder().setCustomId('sbackcfg:toggle_members')
      .setLabel(cfg.include_members ? 'Membres : OFF' : 'Membres : ON')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sbackcfg:backup_now')
      .setLabel('Backup now')
      .setStyle(ButtonStyle.Primary),
  );

  ct.addActionRowComponents(intervalSel);
  ct.addActionRowComponents(maxSel);
  ct.addActionRowComponents(chSel);
  ct.addActionRowComponents(toggles);

  return { container: ct, rows: [intervalSel, maxSel, chSel, toggles] };
}

module.exports = {
  name       : 'serverbackupconfig',
  aliases    : ['sbackconfig', 'sbackcfg'],
  category   : 'owner',
  description: 'Panel de configuration des sauvegardes serveur automatiques.',
  usage      : ';serverbackupconfig',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  buildPanel,

  async execute(message, _args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} Permission requise : **Gérer le serveur**.`,
      ));
      return message.reply({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false },
      }).catch(() => {});
    }

    const { container, rows } = buildPanel(message.guild);
    return message.reply({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
