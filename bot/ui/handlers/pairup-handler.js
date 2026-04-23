'use strict';

const {
  PermissionFlagsBits, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/pairup-storage');

function ephemeralText(interaction, content) {
  return interaction.reply({
    content,
    flags: MessageFlags.Ephemeral,
  }).catch(() => {});
}

async function refreshPanel(interaction) {
  try {
    const { buildPanel } = require('../../commands/configuration/pairupconfig');
    const { container, rows } = buildPanel(interaction.guild);
    return interaction.update({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  } catch (err) {
    console.error('[pairup-handler] refreshPanel:', err);
  }
}

async function handlePairupInteraction(interaction, params, _client) {
  try {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return ephemeralText(interaction, `${e('btn_error')} Permission requise.`);
    }

    const action = params[0];
    const guildId = interaction.guild.id;

    if (interaction.isChannelSelectMenu?.() && action === 'set_channel') {
      storage.setConfig(guildId, { channel_id: interaction.values[0] || null });
    } else if (interaction.isRoleSelectMenu?.() && action === 'set_role') {
      storage.setConfig(guildId, { role_id: interaction.values[0] || null });
    } else if (interaction.isStringSelectMenu?.() && action === 'set_frequency') {
      const freq = interaction.values[0];
      if (['daily', 'weekly', 'monthly'].includes(freq)) {
        storage.setConfig(guildId, { frequency: freq });
      }
    } else if (action === 'toggle_enabled') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { enabled: cur.enabled ? 0 : 1 });
    }

    return refreshPanel(interaction);
  } catch (err) {
    console.error('[pairup-handler] interaction:', err);
    try { await ephemeralText(interaction, `${e('btn_error')} Erreur interne.`); } catch {}
  }
}

module.exports = {
  handlePairupInteraction,
};
