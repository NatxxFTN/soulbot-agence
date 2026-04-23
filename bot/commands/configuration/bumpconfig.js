'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderBumpConfigPanel } = require('../../ui/panels/bumpconfig-panel');

module.exports = {
  name       : 'bumpconfig',
  aliases    : ['bumpcfg', 'bconfig'],
  category   : 'configuration',
  description: 'Configure le système de rappel Bump Disboard.',
  usage      : ';bumpconfig',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({
        embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer le serveur**.')],
      });
    }

    const payload = renderBumpConfigPanel(message.guild.id);
    await message.reply({ ...payload, allowedMentions: { repliedUser: false } });
  },
};
