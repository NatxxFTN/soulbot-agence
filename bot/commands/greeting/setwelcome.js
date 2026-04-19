'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { updateConfig, formatMessage } = require('../../core/greeting-helper');

module.exports = {
  name       : 'setwelcome',
  aliases    : ['setjoin', 'welcomemsg'],
  description: 'Personnaliser le message d\'arrivée.',
  usage      : ';setwelcome <message>  — variables : {user} {username} {server} {count}',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const newMsg = args.join(' ').trim();
    if (!newMsg) {
      return message.reply({
        embeds: [
          E.info('Aide setwelcome', 'Exemple : `;setwelcome Bienvenue {user} sur {server} ! On est {count}.`\n\nVariables : `{user}` · `{username}` · `{server}` · `{count}`'),
        ],
      });
    }

    if (newMsg.length > 500) {
      return message.reply({ embeds: [E.error('Trop long', 'Le message ne peut pas dépasser **500 caractères**.')] });
    }

    updateConfig(message.guild.id, { join_message: newMsg });

    const preview = formatMessage(newMsg, message.member);

    return message.reply({
      embeds: [
        E.success('Message d\'arrivée défini')
          .addFields(
            { name: 'Template', value: newMsg },
            { name: 'Aperçu',   value: preview },
          ),
      ],
    });
  },
};
