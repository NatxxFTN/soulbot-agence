'use strict';

const {
  PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'pin',
  aliases    : ['epingler'],
  category   : 'utility',
  description: 'Épingle un message (en réponse ou par ID).',
  usage      : ';pin [messageId] — ou en répondant à un message',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les messages**.')] });
    }

    if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission d\'épingler des messages.')] });
    }

    let target = null;

    if (message.reference?.messageId) {
      try { target = await message.channel.messages.fetch(message.reference.messageId); } catch { /* not found */ }
    }

    if (!target && args[0]) {
      try { target = await message.channel.messages.fetch(args[0]); } catch { /* not found */ }
    }

    if (!target) {
      return message.reply({ embeds: [E.error('Message introuvable', 'Réponds à un message ou fournis un ID valide.')] });
    }

    const loadingCt = new ContainerBuilder().setAccentColor(0xFF0000);
    loadingCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_loading')} Épinglage en cours...`));
    const loadingMsg = await message.reply({
      components: [loadingCt],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });

    try {
      await target.pin(`Pin par ${message.author.tag}`);

      const ts = Math.floor(Date.now() / 1000);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Message épinglé**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_pin')} Message : [Voir](<${target.url}>)\n` +
        `${e('ui_user')} Auteur : ${target.author}\n` +
        `${e('ui_members')} Épinglé par : ${message.author}\n` +
        `${e('ui_pin')} Date : <t:${ts}:R>`
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_success')} Message épinglé avec succès.`));
      await loadingMsg.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 });

    } catch {
      const errCt = new ContainerBuilder().setAccentColor(0xFF0000);
      errCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Erreur** — Impossible d'épingler ce message (limite atteinte ou permission manquante).`));
      await loadingMsg.edit({ components: [errCt], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
