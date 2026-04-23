'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/reminder-storage');

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
  name       : 'reminderdelete',
  aliases    : ['reminddel', 'remdel'],
  category   : 'utility',
  description: 'Supprime un rappel par ID.',
  usage      : ';reminderdelete <id>',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [],

  async execute(message, args, _client) {
    const id = parseInt(args[0], 10);
    if (!id) return plain(message, `${e('btn_error')} Usage : \`;reminderdelete <id>\``);

    const rem = storage.getReminder(id);
    if (!rem || rem.guild_id !== message.guild.id) {
      return plain(message, `${e('btn_error')} Rappel introuvable.`);
    }

    const isOwner = rem.created_by === message.author.id;
    const isManager = message.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
    if (!isOwner && !isManager) {
      return plain(message, `${e('btn_error')} Tu ne peux supprimer que tes propres rappels (sauf si **Gérer le serveur**).`);
    }

    const ok = storage.deleteReminder(id);
    if (!ok) return plain(message, `${e('btn_error')} Échec de la suppression.`);

    return plain(message, `${e('btn_success')} Rappel **#${id}** supprimé.`);
  },
};
