'use strict';

const { MessageFlags } = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/access-storage');

async function handleOwnersInteraction(interaction, params) {
  const action = params[0];
  const arg    = params[1];

  // Buyer+ requis (BotOwner inclus via ac.isBuyer)
  if (!ac.isBuyer(interaction.guild.id, interaction.user.id)) {
    await interaction.reply({
      content: `${e('btn_error')} Seuls les Buyers et le BotOwner peuvent gérer les owners.`,
      flags  : MessageFlags.Ephemeral,
    }).catch(() => {});
    return;
  }

  const { renderOwnersPanel } = require('../../commands/owner/owners');

  try {
    if (action === 'remove' && arg) {
      storage.removeOwner(interaction.guild.id, arg);
      const panel = renderOwnersPanel(interaction.guild, 0);
      await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    if (action === 'prev' || action === 'next') {
      const currentPage = parseInt(arg, 10) || 0;
      const newPage     = action === 'prev' ? currentPage - 1 : currentPage + 1;
      const panel       = renderOwnersPanel(interaction.guild, newPage);
      await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    if (action === 'refresh') {
      const panel = renderOwnersPanel(interaction.guild, 0);
      await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      return;
    }
  } catch (err) {
    console.error('[owners-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${e('btn_error')} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

module.exports = { handleOwnersInteraction };
