'use strict';

const E = require('../../utils/embeds');
const { getUserLevel } = require('../../core/permissions');
const { LEVELS } = require('../../core/permissions-levels');
const { renderNukePanel } = require('../../ui/panels/nuke-panel');

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
    if (getUserLevel(message.author.id, message.guild.id) < LEVELS.OWNER) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Owner bot uniquement. **Aucune exception.**')] });
    }
    return message.channel.send(renderNukePanel(message.guild.id));
  },
};

module.exports.COOLDOWN_MS  = COOLDOWN_MS;
module.exports.activeResets = activeResets;
