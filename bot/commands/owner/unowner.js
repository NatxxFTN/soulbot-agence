'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/access-storage');

function parseTargets(message, args) {
  const ids = new Set();
  for (const m of message.mentions.users.values()) ids.add(m.id);
  for (const a of args) if (/^\d{17,20}$/.test(a)) ids.add(a);
  return [...ids];
}

module.exports = {
  name       : 'unowner',
  aliases    : ['removeowner', 'delowner'],
  category   : 'owner',
  description: 'Retire un ou plusieurs owners du serveur (Buyer+).',
  usage      : ';unowner @user1 [@user2 ...]',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, args) {
    const authorId = message.author.id;
    const guildId  = message.guild.id;

    if (!ac.isBuyer(guildId, authorId)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Accès refusé**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_lock')} Seuls les **Buyers** et le **BotOwner** peuvent retirer des Owners.\n` +
        `${e('ui_user')} Ton niveau : ${ac.getPermissionBadge(ac.getPermissionLevel(guildId, authorId))}`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const targets = parseTargets(message, args);
    if (targets.length === 0) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Syntaxe invalide**\n${e('cat_information')} Usage : \`;unowner @user1 [@user2 ...]\``,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const removed  = [];
    const notFound = [];
    for (const uid of targets) {
      if (storage.removeOwner(guildId, uid)) removed.push(uid);
      else notFound.push(uid);
    }

    const total = storage.countOwners(guildId);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Owner(s) retiré(s)** ${e('ani_diamond')}`),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    if (removed.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('cat_owner')} **Retiré(s)** : ${removed.map(u => `<@${u}>`).join(', ')}\n` +
          `${e('ui_user')} **Par** : <@${authorId}>\n` +
          `${e('cat_information')} **Serveur** : ${message.guild.name}`,
        ),
      );
    }
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_success')} **${removed.length}** retiré(s) · ${e('ui_chart')} Total owners : **${total}**`,
      ),
    );
    if (notFound.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('btn_error')} **Non-owners (ignorés)** : ${notFound.map(u => `<@${u}>`).join(', ')}`,
        ),
      );
    }

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
