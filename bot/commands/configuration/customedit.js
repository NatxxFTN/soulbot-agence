'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/custom-commands-storage');

function truncate(s, max = 120) {
  if (!s) return '*(vide)*';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function replyError(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags     : MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  });
}

module.exports = {
  name       : 'customedit',
  aliases    : ['cedit'],
  category   : 'configuration',
  description: 'Édite la réponse d\'une commande custom existante.',
  usage      : ';customedit <nom> <nouvelle_réponse>',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, args) {
    const guildId = message.guild.id;

    if (!ac.hasAccess(guildId, message.author.id)) {
      return replyError(message, `${e('btn_error')} **Accès refusé** — Niveau Owner+ requis.`);
    }

    const name        = (args[0] || '').toLowerCase();
    const newResponse = args.slice(1).join(' ');

    if (!name || !newResponse) {
      return replyError(message,
        `${e('btn_error')} **Syntaxe invalide**\n${e('cat_information')} Usage : \`;customedit <nom> <nouvelle_réponse>\``,
      );
    }

    const cmd = storage.getCommand(guildId, name);
    if (!cmd) {
      return replyError(message, `${e('btn_error')} \`;${name}\` n'existe pas sur ce serveur.`);
    }

    const before = cmd.response_type === 'text' ? cmd.response_text : '*(embed JSON)*';

    try {
      storage.updateCommand(guildId, name, 'text', { text: newResponse });
    } catch (err) {
      return replyError(message, `${e('btn_error')} ${err.message}`);
    }

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('btn_edit')} **Commande modifiée**`),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('ui_edit')} \`;${name}\`\n` +
        `${e('btn_error')} **Avant** : ${truncate(before)}\n` +
        `${e('btn_success')} **Après** : ${truncate(newResponse)}`,
      ),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('btn_tip')} Teste-la avec \`;${name}\``),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
