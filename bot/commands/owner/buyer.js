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
  name       : 'buyer',
  aliases    : ['addbuyer'],
  category   : 'owner',
  description: 'Ajoute un ou plusieurs buyers sur ce serveur (BotOwner only).',
  usage      : ';buyer @user1 [@user2 ...]',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, args) {
    const authorId = message.author.id;
    const guildId  = message.guild.id;

    // ── Guard BotOwner ──────────────────────────────────────────────────────
    if (!ac.isBotOwner(authorId)) {
      return replyAccessDenied(message, ac.getPermissionBadge(ac.getPermissionLevel(guildId, authorId)));
    }

    const targets = parseTargets(message, args);
    if (targets.length === 0) return replyInvalidSyntax(message);

    if (targets.includes(authorId)) return replySelfTarget(message);

    const added   = [];
    const ignored = [];
    for (const uid of targets) {
      if (storage.isBuyer(guildId, uid)) ignored.push(uid);
      else if (storage.addBuyer(guildId, uid, authorId)) added.push(uid);
    }

    const total = storage.countBuyers(guildId);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Buyer(s) ajouté(s)** ${e('ani_diamond')}`),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    if (added.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ui_user')} **Ajouté(s)** : ${added.map(u => `<@${u}>`).join(', ')}`,
        ),
      );
    }
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('ui_crown')} **Par** : <@${authorId}> *(BotOwner)*\n` +
        `${e('cat_information')} **Serveur** : ${message.guild.name}`,
      ),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_success')} **${added.length}** buyer(s) ajouté(s) · ${e('ui_chart')} Total serveur : **${total}**`,
      ),
    );
    if (ignored.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('btn_error')} **Déjà buyers (ignorés)** : ${ignored.map(u => `<@${u}>`).join(', ')}`,
        ),
      );
    }
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_tip')} Ils peuvent maintenant ajouter des Owners via \`;owner @user\`.`,
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};

function replyAccessDenied(message, badge) {
  const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Accès refusé**`));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('ui_lock')} Seul le **BotOwner** peut ajouter des Buyers.\n${e('ui_user')} Ton niveau : ${badge}`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('btn_tip')} Si tu penses que c'est une erreur, contacte le BotOwner.`,
  ));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

function replyInvalidSyntax(message) {
  const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('btn_error')} **Syntaxe invalide**\n${e('cat_information')} Usage : \`;buyer @user1 [@user2 ...]\`\n${e('btn_tip')} Exemple : \`;buyer @Thomas @Léa\``,
  ));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

function replySelfTarget(message) {
  const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('btn_error')} **Tu ne peux pas te cibler toi-même.**`,
  ));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}
