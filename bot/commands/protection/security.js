'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const E = require('../../utils/embeds');
const { renderSecurityPanel } = require('../../ui/panels/security-panel');

module.exports = {
  name       : 'security',
  aliases    : ['sec', 'securite', 'protect'],
  category   : 'protection',
  description: 'Panel central de sécurité — toggle toutes les protections.',
  usage      : ';security',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de **Gérer le serveur**.')] });
    }

    const panel = renderSecurityPanel(message.guild);
    await message.reply({
      components: [panel],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
