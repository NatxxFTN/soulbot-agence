'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/twitch-storage');
const api = require('../../core/twitch-api');

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
  name       : 'twitch',
  aliases    : ['tw'],
  category   : 'utility',
  description: 'Gère les notifications Twitch (add/remove/list).',
  usage      : ';twitch <add|remove|list> [username]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const sub = (args[0] || 'list').toLowerCase();
    const username = (args[1] || '').trim().replace(/^@/, '');

    if (sub === 'list') {
      const list = storage.listStreamers(message.guild.id);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_folder')} **Streamers Twitch suivis** · ${list.length}`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      if (list.length === 0) {
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `Aucun streamer. Ajoute avec \`;twitch add <pseudo>\`.`,
        ));
      } else {
        const lines = list.map(s => {
          const last = s.last_live_at ? `<t:${Math.floor(s.last_live_at / 1000)}:R>` : 'jamais';
          return `• **${s.display_name || s.twitch_username}** · dernier live : ${last}`;
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
      if (!username) return plain(message, `${e('btn_error')} Usage : \`;twitch add <pseudo>\``);
      if (!api.hasCredentials()) {
        return plain(message, `${e('btn_tip')} Configure \`TWITCH_CLIENT_ID\` et \`TWITCH_CLIENT_SECRET\` dans le .env pour utiliser cette fonctionnalité.`);
      }

      const existing = storage.getStreamer(message.guild.id, username);
      if (existing) return plain(message, `${e('btn_tip')} **${username}** est déjà suivi.`);

      try {
        const user = await api.getUserByLogin(username);
        if (!user) return plain(message, `${e('btn_error')} Streamer Twitch introuvable : \`${username}\`.`);
        storage.addStreamer(message.guild.id, user.login, message.author.id, user.display_name, user.id);
        return plain(message, `${e('btn_success')} **${user.display_name}** ajouté aux notifications Twitch.`);
      } catch (err) {
        console.error('[twitch] add:', err);
        return plain(message, `${e('btn_error')} Erreur API Twitch : ${err.message}`);
      }
    }

    if (sub === 'remove' || sub === 'del') {
      if (!username) return plain(message, `${e('btn_error')} Usage : \`;twitch remove <pseudo>\``);
      const ok = storage.removeStreamer(message.guild.id, username);
      if (!ok) return plain(message, `${e('btn_tip')} Aucun streamer \`${username}\` dans la liste.`);
      return plain(message, `${e('btn_success')} **${username}** retiré de la liste.`);
    }

    return plain(message, `${e('btn_error')} Usage : \`;twitch <add|remove|list> [pseudo]\``);
  },
};
