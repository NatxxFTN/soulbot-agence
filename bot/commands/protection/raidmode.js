'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderRaidmodePanel } = require('../../ui/panels/raidmode-panel');
const { withLoading } = require('../../core/loading');

module.exports = {
  name       : 'raidmode',
  aliases    : ['antiraid', 'raid'],
  description: 'Ouvre le panel de protection anti-raid automatique.',
  usage      : ';raidmode',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }
    const { loadingMsg } = await withLoading(message, 'Chargement anti-raid...', async () => {
      return message.channel.send(renderRaidmodePanel(message.guild.id));
    });
    await loadingMsg.delete().catch(() => {});
  },
};
