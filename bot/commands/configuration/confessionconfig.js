'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/confession-storage');

function buildPanel(guild) {
  const cfg = storage.getConfig(guild.id) || {};
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_configuration')} **Configuration · Confessions**`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const ch = cfg.channel_id ? `<#${cfg.channel_id}>` : '*(aucun)*';
  const banWords = storage.parseBanWords(cfg.ban_words);
  const banDesc = banWords.length
    ? `${banWords.slice(0, 10).join(', ')}${banWords.length > 10 ? `… (+${banWords.length - 10})` : ''}`
    : '*(aucun)*';

  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `**Salon** · ${ch}\n` +
    `**Modération préalable** · ${cfg.require_approval ? `${e('btn_success')} oui` : `${e('btn_error')} non`}\n` +
    `**Votes** · ${cfg.allow_votes ? `${e('btn_success')} oui` : `${e('btn_error')} non`}\n` +
    `**Réponses** · ${cfg.allow_replies ? `${e('btn_success')} oui` : `${e('btn_error')} non`}\n` +
    `**Mots interdits** · ${banDesc}`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const chSelect = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('confessioncfg:set_channel')
      .setPlaceholder('Salon des confessions')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1).setMaxValues(1),
  );

  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confessioncfg:toggle_approval')
      .setLabel(cfg.require_approval ? 'Modération : ON' : 'Modération : OFF')
      .setStyle(cfg.require_approval ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('confessioncfg:toggle_votes')
      .setLabel(cfg.allow_votes ? 'Votes : ON' : 'Votes : OFF')
      .setStyle(cfg.allow_votes ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('confessioncfg:toggle_replies')
      .setLabel(cfg.allow_replies ? 'Réponses : ON' : 'Réponses : OFF')
      .setStyle(cfg.allow_replies ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  const wordsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confessioncfg:edit_words')
      .setLabel('Mots interdits')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Danger),
  );

  ct.addActionRowComponents(chSelect);
  ct.addActionRowComponents(toggles);
  ct.addActionRowComponents(wordsRow);

  return { container: ct, rows: [chSelect, toggles, wordsRow] };
}

module.exports = {
  name       : 'confessionconfig',
  aliases    : ['confessioncfg', 'confesscfg'],
  category   : 'configuration',
  description: 'Configure le système de confessions anonymes.',
  usage      : ';confessionconfig',
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
