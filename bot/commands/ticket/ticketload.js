'use strict';

const { PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'ticketload',
  aliases    : ['tload', 'ticketpanel'],
  description: 'Poste un panel ticket avec menu de sélection du type.',
  usage      : ';ticketload',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_type')
      .setPlaceholder('Choisis le type de ticket…')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Support général').setValue('support').setEmoji('💬'),
        new StringSelectMenuOptionBuilder().setLabel('Bug / problème').setValue('bug').setEmoji('🐛'),
        new StringSelectMenuOptionBuilder().setLabel('Partenariat').setValue('partnership').setEmoji('🤝'),
        new StringSelectMenuOptionBuilder().setLabel('Autre').setValue('other').setEmoji('❓'),
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({
      embeds: [
        E.base()
          .setTitle('🎫 Ouvrir un ticket')
          .setDescription('Sélectionne le type de ticket dans le menu ci-dessous.'),
      ],
      components: [row],
    });

    return message.reply({ embeds: [E.success('Panel posté', 'Le panel a été posté dans ce salon.')] });
  },
};
