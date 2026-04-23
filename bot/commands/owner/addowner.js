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
  // Note : nom 'addowner' (évite la collision avec la commande 'owner' déjà parsée
  // dans d'autres contextes). Alias court : 'own'.
  name       : 'addowner',
  aliases    : ['owner', 'own'],
  category   : 'owner',
  description: 'Ajoute un ou plusieurs owners sur ce serveur (Buyer+).',
  usage      : ';addowner @user1 [@user2 ...]',
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
        `${e('ui_lock')} Seuls les **Buyers** et le **BotOwner** peuvent ajouter des Owners.\n` +
        `${e('ui_user')} Ton niveau : ${ac.getPermissionBadge(ac.getPermissionLevel(guildId, authorId))}`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const targets = parseTargets(message, args);
    if (targets.length === 0) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Syntaxe invalide**\n${e('cat_information')} Usage : \`;addowner @user1 [@user2 ...]\``,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (targets.includes(authorId)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Tu ne peux pas te cibler toi-même.**`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const added   = [];
    const ignored = [];
    for (const uid of targets) {
      if (storage.isOwner(guildId, uid)) ignored.push(uid);
      else if (storage.addOwner(guildId, uid, authorId)) added.push(uid);
    }

    const total = storage.countOwners(guildId);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Owner(s) ajouté(s)** ${e('ani_diamond')}`),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    if (added.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('cat_owner')} **Ajouté(s)** : ${added.map(u => `<@${u}>`).join(', ')}\n` +
          `${e('ui_user')} **Par** : <@${authorId}> *(${ac.getPermissionBadge(ac.getPermissionLevel(guildId, authorId))})*\n` +
          `${e('cat_information')} **Serveur** : ${message.guild.name}`,
        ),
      );
    }
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_success')} **${added.length}** owner(s) ajouté(s) · ${e('ui_chart')} Total : **${total}**`,
      ),
    );
    if (ignored.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('btn_error')} **Déjà owners (ignorés)** : ${ignored.map(u => `<@${u}>`).join(', ')}`,
        ),
      );
    }
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_tip')} Ces owners peuvent maintenant utiliser toutes les commandes du bot sur ce serveur.`,
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
