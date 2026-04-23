'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
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
  name       : 'formdelete',
  aliases    : ['formdel'],
  category   : 'configuration',
  description: 'Supprime un formulaire (et ses réponses) par ID.',
  usage      : ';formdelete <id>',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const id = parseInt(args[0], 10);
    if (!id) return plain(message, `${e('btn_error')} Usage : \`;formdelete <id>\``);

    const form = storage.getForm(id);
    if (!form || form.guild_id !== message.guild.id) {
      return plain(message, `${e('btn_error')} Formulaire introuvable.`);
    }

    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_tip')} **Confirmer la suppression**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Formulaire : **#${form.id}** · ${form.title || form.name}\n` +
      `Réponses : **${storage.countSubmissions(id)}**\n\n` +
      `Cette action est irréversible.`,
    ));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`form:confirm_delete:${id}`).setLabel('Supprimer').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('form:cancel_delete').setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    );
    ct.addActionRowComponents(row);

    return message.reply({
      components: [ct, row],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
