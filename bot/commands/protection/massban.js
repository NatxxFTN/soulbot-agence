'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderMassbanPanel } = require('../../ui/panels/massban-panel');
const { withLoading } = require('../../core/loading');

module.exports = {
  name       : 'massban',
  aliases    : ['mban', 'bulkban'],
  description: 'Ouvre le panel de bannissement massif (max 10 IDs).',
  usage      : ';massban',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }
    const { loadingMsg } = await withLoading(message, 'Ban en masse...', async () => {
      return message.channel.send(renderMassbanPanel(message.guild.id));
    });
    await loadingMsg.delete().catch(() => {});
  },
};
