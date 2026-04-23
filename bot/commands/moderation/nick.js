'use strict';

const {
  PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'nick',
  aliases    : ['pseudo'],
  category   : 'moderation',
  description: 'Modifie ou réinitialise le pseudo d\'un membre.',
  usage      : ';nick @membre [nouveau pseudo] — sans pseudo = réinitialise',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les pseudos**.')] });
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre.')] });
    }

    const botMember = message.guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission de modifier les pseudos.')] });
    }

    if (target.roles.highest.position >= botMember.roles.highest.position && target.id !== message.guild.ownerId) {
      return message.reply({ embeds: [E.error('Hiérarchie insuffisante', 'Ce membre est au-dessus ou au même niveau que moi.')] });
    }

    const newNick = args.slice(1).join(' ').trim().slice(0, 32) || null;
    const oldNick = target.nickname ?? target.user.username;

    const loadingCt = new ContainerBuilder().setAccentColor(0xFF0000);
    loadingCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_loading')} Modification du pseudo...`));
    const loadingMsg = await message.reply({
      components: [loadingCt],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });

    try {
      await target.setNickname(newNick, `Nick par ${message.author.tag}`);

      const ts = Math.floor(Date.now() / 1000);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Pseudo modifié**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_user')} Membre : ${target}\n` +
        `${e('ui_members')} Par : ${message.author}\n` +
        `${e('ui_pin')} Date : <t:${ts}:R>`
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        newNick
          ? `${e('btn_success')} \`${oldNick}\` → \`${newNick}\``
          : `${e('btn_success')} Pseudo de ${target.user.username} réinitialisé.`
      ));
      await loadingMsg.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 });

    } catch {
      const errCt = new ContainerBuilder().setAccentColor(0xFF0000);
      errCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Erreur** — Impossible de modifier le pseudo de ce membre.`));
      await loadingMsg.edit({ components: [errCt], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
