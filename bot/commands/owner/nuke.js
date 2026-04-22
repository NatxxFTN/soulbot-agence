'use strict';

const E = require('../../utils/embeds');
const { isOwner } = require('../../core/permissions');
const { renderNukePanel } = require('../../ui/panels/nuke-panel');
const { withLoading } = require('../../core/loading');

const COOLDOWN_MS  = 60 * 60 * 1000;
const activeResets = new Map();

module.exports = {
  name       : 'nuke',
  aliases    : ['reset', 'wipe'],
  description: '💣 Panel Nuke Premium — supprime salons, rôles et emojis avec backup auto.',
  usage      : ';nuke',
  ownerOnly  : true,
  guildOnly  : true,

  async execute(message) {
    if (!isOwner(message.author.id)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Owner bot uniquement. **Aucune exception.**')] });
    }
    const { loadingMsg } = await withLoading(message, 'Nuke en cours...', async () => {
      return message.channel.send(renderNukePanel(message.guild.id));
    });
    await loadingMsg.delete().catch(() => {});
  },
};

module.exports.COOLDOWN_MS  = COOLDOWN_MS;
module.exports.activeResets = activeResets;
