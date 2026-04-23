'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { renderLockdownPanel } = require('../../ui/panels/lockdown-panel');
const { withLoading } = require('../../core/loading');

module.exports = {
  name       : 'lockdown',
  aliases    : ['ld'],
  description: 'Ouvre le panel de verrouillage d\'urgence du serveur.',
  usage      : ';lockdown',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }
    const { loadingMsg } = await withLoading(message, 'Verrouillage...', async () => {
      return message.channel.send(renderLockdownPanel(message.guild.id));
    });
    await loadingMsg.delete().catch(() => {});
  },
};
