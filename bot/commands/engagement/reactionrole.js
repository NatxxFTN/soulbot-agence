'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const { db } = require('../../database');

const STMT_INSERT = db.prepare(
  'INSERT INTO guild_reaction_roles (guild_id, channel_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)'
);

function panel(title, body) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  return container;
}

function replyPanel(message, title, body) {
  return message.reply({
    components: [panel(title, body)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
}

module.exports = {
  name       : 'reactionrole',
  aliases    : ['rr', 'rrole'],
  description: 'Rôle automatique via réaction sur un message.',
  usage      : ';reactionrole <#salon> <message_id> <@role> <emoji>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const channel = message.mentions.channels.first();
    const role = message.mentions.roles.first();
    const messageId = args.find(a => /^\d{17,20}$/.test(a));
    const emoji = args.find(a => !a.startsWith('<#') && !a.startsWith('<@&') && !/^\d{17,20}$/.test(a));

    if (!channel || !role || !messageId || !emoji) {
      return replyPanel(message, `${e('btn_error')} **Usage**`, '`;reactionrole <#salon> <message_id> <@role> <emoji>`');
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
      return replyPanel(message, `${e('btn_error')} **Hiérarchie**`, 'Mon rôle doit être au-dessus.');
    }

    let target;
    try { target = await channel.messages.fetch(messageId); }
    catch { return replyPanel(message, `${e('btn_error')} **Message introuvable**`, 'Vérifie l\'ID.'); }

    try { await target.react(emoji); }
    catch (err) {
      return replyPanel(message, `${e('btn_error')} **Réaction impossible**`, `Emoji invalide ou inaccessible : ${err.message}`);
    }

    try {
      STMT_INSERT.run(message.guild.id, channel.id, messageId, emoji, role.id);
    } catch (err) {
      return replyPanel(message, `${e('btn_error')} **Erreur DB**`, err.message);
    }

    return replyPanel(message, `${e('btn_success')} **Reaction role ajouté**`, `${emoji} sur [ce message](${target.url}) attribue ${role}`);
  },
};
