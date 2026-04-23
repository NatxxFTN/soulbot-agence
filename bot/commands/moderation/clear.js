'use strict';

const {
  PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'clear',
  aliases    : ['purge'],
  category   : 'moderation',
  description: 'Supprime des messages en masse (1–100), avec filtre utilisateur optionnel.',
  usage      : ';clear <nombre> [@membre]',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les messages**.')] });
    }

    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply({ embeds: [E.error('Valeur invalide', 'Entre un nombre entre **1** et **100**.')] });
    }

    const targetUser = message.mentions.users.first() ?? null;

    const loadingCt = new ContainerBuilder().setAccentColor(0xFF0000);
    loadingCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_loading')} Suppression en cours...`));
    const loadingMsg = await message.reply({
      components: [loadingCt],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });

    try {
      if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        throw new Error('no_perm');
      }

      let fetched = await message.channel.messages.fetch({ limit: 100 });
      fetched = fetched.filter(m => m.id !== loadingMsg.id && m.id !== message.id);

      if (targetUser) {
        fetched = fetched.filter(m => m.author.id === targetUser.id);
      }

      const toDelete = [...fetched.values()].slice(0, amount);
      const deleted  = await message.channel.bulkDelete(toDelete, true);

      const ts = Math.floor(Date.now() / 1000);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Messages supprimés**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_chat')} Salon : ${message.channel}\n` +
        `${e('ui_user')} Par : ${message.author}\n` +
        (targetUser ? `${e('ui_members')} Filtre : ${targetUser}\n` : '') +
        `${e('ui_pin')} Date : <t:${ts}:R>`
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_success')} **${deleted.size}** message(s) effacé(s).`));

      STMT.run(
        message.guild.id, 'CLEAR', message.author.id, message.author.tag,
        `${deleted.size} messages dans #${message.channel.name}${targetUser ? ` (filtre: ${targetUser.tag})` : ''}`
      );

      await loadingMsg.edit({ components: [ct], flags: MessageFlags.IsComponentsV2 });

      setTimeout(() => loadingMsg.delete().catch(() => {}), 4000);

    } catch {
      const errCt = new ContainerBuilder().setAccentColor(0xFF0000);
      errCt.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Erreur** — Impossible de supprimer les messages (trop anciens ou permission manquante).`));
      await loadingMsg.edit({ components: [errCt], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
