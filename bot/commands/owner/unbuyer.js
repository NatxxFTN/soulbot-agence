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
  name       : 'unbuyer',
  aliases    : ['removebuyer', 'delbuyer'],
  category   : 'owner',
  description: 'Retire un ou plusieurs buyers du serveur (BotOwner only).',
  usage      : ';unbuyer @user1 [@user2 ...]',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, args) {
    const authorId = message.author.id;
    const guildId  = message.guild.id;

    if (!ac.isBotOwner(authorId)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Accès refusé**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_lock')} Seul le **BotOwner** peut retirer des Buyers.\n` +
        `${e('ui_user')} Ton niveau : ${ac.getPermissionBadge(ac.getPermissionLevel(guildId, authorId))}`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const targets = parseTargets(message, args);
    if (targets.length === 0) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Syntaxe invalide**\n${e('cat_information')} Usage : \`;unbuyer @user1 [@user2 ...]\``,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const removed = [];
    const notFound = [];
    for (const uid of targets) {
      if (storage.removeBuyer(guildId, uid)) removed.push(uid);
      else notFound.push(uid);
    }

    const total = storage.countBuyers(guildId);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Buyer(s) retiré(s)** ${e('ani_diamond')}`),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    if (removed.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ui_user')} **Retiré(s)** : ${removed.map(u => `<@${u}>`).join(', ')}\n` +
          `${e('ui_crown')} **Par** : <@${authorId}> *(BotOwner)*\n` +
          `${e('cat_information')} **Serveur** : ${message.guild.name}`,
        ),
      );
    }
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_success')} **${removed.length}** retiré(s) · ${e('ui_chart')} Total buyers : **${total}**`,
      ),
    );
    if (notFound.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('btn_error')} **Non-buyers (ignorés)** : ${notFound.map(u => `<@${u}>`).join(', ')}`,
        ),
      );
    }
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_tip')} Note : leurs Owners ajoutés restent actifs. Utilise \`;unowner\` pour les retirer aussi.`,
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
