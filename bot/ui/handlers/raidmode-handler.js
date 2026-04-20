'use strict';

const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { renderRaidmodePanel } = require('../panels/raidmode-panel');
const { getRaidmodeConfig, updateRaidmodeConfig, clearDetections, VALID_ACTIONS } = require('../../core/raidmode-helper');
const { EMOJIS } = require('../theme');

async function handleRaidmodeInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: `${EMOJIS.cross()} Administrateur requis.`, flags: MessageFlags.Ephemeral });
  }

  const action  = interaction.customId.replace('raidmode:', '');
  const guildId = interaction.guild.id;

  try {
    if (action === 'enable') {
      updateRaidmodeConfig(guildId, { active: 1 }, interaction.user.id);
      return interaction.update(renderRaidmodePanel(guildId));
    }

    if (action === 'disable') {
      updateRaidmodeConfig(guildId, { active: 0 }, interaction.user.id);
      return interaction.update(renderRaidmodePanel(guildId));
    }

    if (action === 'action') {
      const value = interaction.values[0];
      if (!VALID_ACTIONS.includes(value)) {
        return interaction.reply({ content: `${EMOJIS.cross()} Action invalide.`, flags: MessageFlags.Ephemeral });
      }
      updateRaidmodeConfig(guildId, { action: value }, interaction.user.id);
      return interaction.update(renderRaidmodePanel(guildId));
    }

    if (action === 'configure') {
      const cfg   = getRaidmodeConfig(guildId) || {};
      const modal = new ModalBuilder()
        .setCustomId('raidmode:save_config')
        .setTitle('Configurer le seuil Raidmode');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('threshold')
            .setLabel('Nombre de joins déclenchant le raidmode (2-20)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(2)
            .setValue(String(cfg.join_threshold ?? 5)),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('window')
            .setLabel('Fenêtre de temps en secondes (5-60)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(2)
            .setValue(String(cfg.join_window_sec ?? 10)),
        ),
      );
      return interaction.showModal(modal);
    }

    if (action === 'save_config') {
      const threshStr = interaction.fields.getTextInputValue('threshold').trim();
      const windowStr = interaction.fields.getTextInputValue('window').trim();
      const threshold = parseInt(threshStr, 10);
      const windowSec = parseInt(windowStr, 10);

      if (isNaN(threshold) || threshold < 2 || threshold > 20) {
        return interaction.reply({ content: `${EMOJIS.cross()} Seuil invalide (2-20).`, flags: MessageFlags.Ephemeral });
      }
      if (isNaN(windowSec) || windowSec < 5 || windowSec > 60) {
        return interaction.reply({ content: `${EMOJIS.cross()} Fenêtre invalide (5-60s).`, flags: MessageFlags.Ephemeral });
      }

      updateRaidmodeConfig(guildId, { join_threshold: threshold, join_window_sec: windowSec }, interaction.user.id);
      return interaction.update(renderRaidmodePanel(guildId));
    }

    if (action === 'clear_dets') {
      clearDetections(guildId);
      return interaction.update(renderRaidmodePanel(guildId));
    }

  } catch (err) {
    const content = `${EMOJIS.cross()} Erreur : ${err.message}`;
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('raidmode', handleRaidmodeInteraction);
  client.selectHandlers.set('raidmode', handleRaidmodeInteraction);
  client.modalHandlers.set('raidmode',  handleRaidmodeInteraction);
}

module.exports = { handleRaidmodeInteraction, register };
