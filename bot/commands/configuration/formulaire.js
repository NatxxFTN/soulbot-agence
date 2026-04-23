'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');

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
  name       : 'formulaire',
  aliases    : ['form'],
  category   : 'configuration',
  description: 'Crée un formulaire interactif avec jusqu\'à 3 questions.',
  usage      : ';formulaire',
  cooldown   : 5,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, _args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_configuration')} **Création d'un formulaire**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Clique sur le bouton ci-dessous pour ouvrir le formulaire de création.\n` +
      `Tu pourras définir le nom, le titre, la description et 3 questions.\n` +
      `Le bouton "Remplir" sera posté dans ce salon.`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('form:open_create')
        .setLabel('Ouvrir le formulaire de création')
        .setStyle(ButtonStyle.Primary),
    );
    ct.addActionRowComponents(row);

    return message.reply({
      components: [ct, row],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
