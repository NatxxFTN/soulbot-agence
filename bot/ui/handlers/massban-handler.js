'use strict';

const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { renderMassbanPanel } = require('../panels/massban-panel');
const { db } = require('../../database');
const { EMOJIS } = require('../theme');

const STMT_LOG = db.prepare(`
  INSERT INTO massban_logs (guild_id, banned_by, banned_ids, reason, success, failed)
  VALUES (?, ?, ?, ?, ?, ?)
`);

async function handleMassbanInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: `${EMOJIS.cross()} Administrateur requis.`, flags: MessageFlags.Ephemeral });
  }

  const action  = interaction.customId.replace('massban:', '');
  const guildId = interaction.guild.id;

  try {
    if (action === 'open_modal') {
      const modal = new ModalBuilder()
        .setCustomId('massban:execute')
        .setTitle('Massban — IDs à bannir');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ids')
            .setLabel('IDs Discord (1 par ligne, max 10)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(300)
            .setPlaceholder('123456789012345678\n987654321098765432\n...'),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Raison (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(200),
        ),
      );
      return interaction.showModal(modal);
    }

    if (action === 'execute') {
      const raw    = interaction.fields.getTextInputValue('ids');
      const reason = interaction.fields.getTextInputValue('reason').trim() || 'Massban';
      const ids    = raw.split(/[\s,\n]+/).map(s => s.trim()).filter(s => /^\d{17,20}$/.test(s)).slice(0, 10);

      if (ids.length === 0) {
        return interaction.reply({ content: `${EMOJIS.cross()} Aucun ID valide fourni.`, flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      let success = 0;
      let failed  = 0;
      for (const id of ids) {
        try {
          await interaction.guild.members.ban(id, { reason: `${reason} (massban par ${interaction.user.tag})`, deleteMessageSeconds: 0 });
          success++;
        } catch { failed++; }
      }

      STMT_LOG.run(guildId, interaction.user.id, ids.join(','), reason, success, failed);

      await interaction.editReply({
        content: `${EMOJIS.check()} Massban terminé — **${success}** bannis · **${failed}** échecs sur ${ids.length} ID(s).`,
      });
      // Rafraîchit le panel dans un follow-up
      await interaction.followUp({ ...renderMassbanPanel(guildId), flags: undefined });
      return;
    }

    if (action === 'close') {
      await interaction.deferUpdate();
      return interaction.message.delete().catch(() => {});
    }

  } catch (err) {
    const content = `${EMOJIS.cross()} Erreur : ${err.message}`;
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content }).catch(() => {});
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('massban', handleMassbanInteraction);
  client.modalHandlers.set('massban',  handleMassbanInteraction);
}

module.exports = { handleMassbanInteraction, register };
