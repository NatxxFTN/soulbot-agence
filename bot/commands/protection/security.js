'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { buildHubPayload } = require('../../ui/soc-image');

module.exports = {
  name       : 'security',
  aliases    : ['sec', 'securite', 'protect'],
  category   : 'protection',
  description: 'Security Studio V5 — hub central de toutes les protections.',
  usage      : ';security',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de **Gérer le serveur**.')] });
    }

    const payload = buildHubPayload(message.guild);
    await message.reply({ ...payload, allowedMentions: { repliedUser: false, parse: [] } });
  },
};
