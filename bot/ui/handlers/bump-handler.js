'use strict';

// ── Bump — handlers boutons (stats / leaderboard) ─────────────────────────────
// Boutons du panel ;bump : customId = "bump:stats" | "bump:leaderboard"
// Enregistrés dans ready.js via client.buttonHandlers.set('bump', …)

const { MessageFlags } = require('discord.js');
const { e } = require('../../core/emojis');

async function handleBumpInteraction(interaction, params, client) {
  const action = params[0];

  // Shim message pour réutiliser la logique des commandes sans dupliquer.
  // La réponse passe en ephemeral pour ne pas spam le salon.
  const shim = {
    guild  : interaction.guild,
    author : interaction.user,
    channel: interaction.channel,
    reply  : async (payload) => interaction.reply({
      ...payload,
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    }),
  };

  try {
    if (action === 'stats') {
      const cmd = require('../../commands/utility/bumpstats');
      return cmd.execute(shim, [], client);
    }

    if (action === 'leaderboard') {
      const cmd = require('../../commands/utility/bumplb');
      return cmd.execute(shim, [], client);
    }
  } catch (err) {
    console.error('[bump-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${e('btn_error')} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

module.exports = { handleBumpInteraction };
