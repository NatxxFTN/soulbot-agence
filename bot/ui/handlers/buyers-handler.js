'use strict';

const { MessageFlags } = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/access-storage');

async function handleBuyersInteraction(interaction, params) {
  const action = params[0];
  const arg    = params[1];

  if (!ac.isBotOwner(interaction.user.id)) {
    await interaction.reply({
      content: `${e('btn_error')} Seul le BotOwner peut gérer les buyers.`,
      flags  : MessageFlags.Ephemeral,
    }).catch(() => {});
    return;
  }

  const { renderBuyersPanel } = require('../../commands/owner/buyers');

  try {
    if (action === 'remove' && arg) {
      storage.removeBuyer(interaction.guild.id, arg);
      const panel = renderBuyersPanel(interaction.guild, 0);
      await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    if (action === 'prev' || action === 'next') {
      const currentPage = parseInt(arg, 10) || 0;
      const newPage     = action === 'prev' ? currentPage - 1 : currentPage + 1;
      const panel       = renderBuyersPanel(interaction.guild, newPage);
      await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    if (action === 'refresh') {
      const panel = renderBuyersPanel(interaction.guild, 0);
      await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      return;
    }
  } catch (err) {
    console.error('[buyers-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${e('btn_error')} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

module.exports = { handleBuyersInteraction };
