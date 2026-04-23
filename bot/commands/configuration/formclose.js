'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/form-storage');

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
  name       : 'formclose',
  aliases    : [],
  category   : 'configuration',
  description: 'Ferme un formulaire (plus de nouvelles réponses).',
  usage      : ';formclose <id>',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const id = parseInt(args[0], 10);
    if (!id) return plain(message, `${e('btn_error')} Usage : \`;formclose <id>\``);

    const form = storage.getForm(id);
    if (!form || form.guild_id !== message.guild.id) {
      return plain(message, `${e('btn_error')} Formulaire introuvable.`);
    }
    if (form.closed) return plain(message, `${e('btn_tip')} Le formulaire **#${id}** est déjà fermé.`);

    const ok = storage.closeForm(id);
    if (!ok) return plain(message, `${e('btn_error')} Échec de la fermeture.`);

    return plain(message, `${e('btn_success')} Formulaire **#${id}** fermé avec succès.`);
  },
};
