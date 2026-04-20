'use strict';

const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags, PermissionFlagsBits, ChannelType, OverwriteType } = require('discord.js');
const { renderLockdownPanel } = require('../panels/lockdown-panel');
const { getLockdownConfig, setLockdownActive, addLockedChannel, getLockedChannels, clearLockedChannels } = require('../../core/lockdown-helper');
const { EMOJIS } = require('../theme');

async function handleLockdownInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: `${EMOJIS.cross()} Administrateur requis.`, flags: MessageFlags.Ephemeral });
  }

  const action  = interaction.customId.replace('lockdown:', '');
  const guildId = interaction.guild.id;

  try {
    if (action === 'lock') {
      await interaction.deferUpdate();
      await executeLock(interaction, guildId);
      return interaction.editReply(renderLockdownPanel(guildId));
    }

    if (action === 'unlock') {
      await interaction.deferUpdate();
      await executeUnlock(interaction, guildId);
      return interaction.editReply(renderLockdownPanel(guildId));
    }

    if (action === 'set_reason') {
      const cfg = getLockdownConfig(guildId) || {};
      const modal = new ModalBuilder()
        .setCustomId('lockdown:save_reason')
        .setTitle('Raison du lockdown');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Raison (max 200 caractères)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(200)
            .setValue(cfg.reason ? String(cfg.reason).slice(0, 200) : ''),
        ),
      );
      return interaction.showModal(modal);
    }

    if (action === 'save_reason') {
      const reason  = interaction.fields.getTextInputValue('reason').trim();
      const cfg     = getLockdownConfig(guildId) || {};
      setLockdownActive(guildId, {
        active      : !!cfg.active,
        lockedBy    : cfg.locked_by,
        reason,
        lockedCount : getLockedChannels(guildId).length,
      });
      return interaction.update(renderLockdownPanel(guildId));
    }

    if (action === 'close') {
      return interaction.update({ content: '🔒 Panel fermé.', components: [], flags: MessageFlags.IsComponentsV2 });
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

async function executeLock(interaction, guildId) {
  const { guild } = interaction;
  const everyoneId = guild.id;
  let count = 0;

  for (const ch of guild.channels.cache.values()) {
    if (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement) continue;
    try {
      const existing = ch.permissionOverwrites.cache.get(everyoneId);
      const alreadyDenied = existing?.deny?.has(PermissionFlagsBits.SendMessages);
      if (!alreadyDenied) {
        await ch.permissionOverwrites.edit(everyoneId, { SendMessages: false }, { reason: `Lockdown par ${interaction.user.tag}` });
        addLockedChannel(guildId, ch.id);
        count++;
      }
    } catch { /* pas de perms sur ce salon */ }
  }

  setLockdownActive(guildId, { active: true, lockedBy: interaction.user.id, reason: getLockdownConfig(guildId)?.reason, lockedCount: count });
}

async function executeUnlock(interaction, guildId) {
  const { guild } = interaction;
  const everyoneId    = guild.id;
  const lockedChans   = getLockedChannels(guildId);

  for (const channelId of lockedChans) {
    const ch = guild.channels.cache.get(channelId);
    if (!ch) continue;
    try {
      await ch.permissionOverwrites.edit(everyoneId, { SendMessages: null }, { reason: `Fin lockdown par ${interaction.user.tag}` });
    } catch { /* ignoré */ }
  }

  clearLockedChannels(guildId);
  setLockdownActive(guildId, { active: false, lockedBy: null, reason: null, lockedCount: 0 });
}

function register(client) {
  client.buttonHandlers.set('lockdown', handleLockdownInteraction);
  client.modalHandlers.set('lockdown',  handleLockdownInteraction);
}

module.exports = { handleLockdownInteraction, register };
