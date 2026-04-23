'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ChannelType,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/autoreact-storage');

const EMOJI_REGEX = /<a?:\w+:\d+>|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{2700}-\u{27BF}]/gu;

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

function parseChannel(message, arg) {
  if (!arg) return null;
  const match = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d+)$/);
  if (!match) return null;
  const ch = message.guild.channels.cache.get(match[1]);
  if (!ch || ch.type !== ChannelType.GuildText) return null;
  return ch;
}

module.exports = {
  name       : 'autoreact',
  aliases    : ['areact'],
  category   : 'configuration',
  description: 'Ajoute automatiquement des réactions aux messages d\'un salon.',
  usage      : ';autoreact <add|remove|list> [#salon] [emoji1 emoji2 emoji3]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'list' || !sub) {
      const rows = storage.listAutoreacts(message.guild.id);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_folder')} **Auto-réactions actives** · ${rows.length}`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      if (rows.length === 0) {
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `Aucune configuration. Ajoute avec \`;autoreact add #salon emoji1 [emoji2] [emoji3]\`.`,
        ));
      } else {
        const lines = rows.map(r => {
          const emojis = (r.emojis || []).join(' ') || '*(aucun)*';
          return `<#${r.channel_id}> · ${emojis}`;
        });
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
      }
      return message.reply({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false },
      }).catch(() => {});
    }

    if (sub === 'add') {
      const channel = parseChannel(message, args[1]);
      if (!channel) return plain(message, `${e('btn_error')} Usage : \`;autoreact add #salon emoji1 [emoji2] [emoji3]\``);

      const rest = args.slice(2).join(' ');
      const matches = rest.match(EMOJI_REGEX) || [];
      if (matches.length === 0) {
        return plain(message, `${e('btn_error')} Aucun emoji détecté. Utilise jusqu'à 5 emojis.`);
      }
      const emojis = matches.slice(0, 5);

      const ok = storage.setAutoreact(message.guild.id, channel.id, emojis, message.author.id, 1);
      if (!ok) return plain(message, `${e('btn_error')} Erreur lors de l'enregistrement.`);

      return plain(message,
        `${e('btn_success')} Auto-réaction activée sur ${channel} avec : ${emojis.join(' ')}`,
      );
    }

    if (sub === 'remove' || sub === 'delete' || sub === 'del') {
      const channel = parseChannel(message, args[1]);
      if (!channel) return plain(message, `${e('btn_error')} Usage : \`;autoreact remove #salon\``);

      const ok = storage.removeAutoreact(message.guild.id, channel.id);
      if (!ok) return plain(message, `${e('btn_tip')} Aucune auto-réaction sur ce salon.`);

      return plain(message, `${e('btn_success')} Auto-réaction désactivée sur ${channel}.`);
    }

    return plain(message, `${e('btn_error')} Usage : \`;autoreact <add|remove|list> [#salon] [emoji1 emoji2 emoji3]\``);
  },
};
