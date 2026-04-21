'use strict';

const {
  MessageFlags,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { renderHelpHome, renderHelpCategory } = require('../panels/help-panel');
const { findCommand, scanCommands }          = require('../../core/help-helper');

const CATS_PER_PAGE = 10;
const CMDS_PER_PAGE = 8;

async function handleHelpInteraction(interaction) {
  const customId    = interaction.customId;
  const botAvatarURL = interaction.client.user.displayAvatarURL({ size: 256, extension: 'png' });

  try {
    // ── Dropdown sélection catégorie ──────────────────────────────────────────
    if (customId === 'help:category') {
      return interaction.update(renderHelpCategory(interaction.values[0], 1));
    }

    // ── Navigation : help:nav:<screen>:<action>[:<args>] ─────────────────────
    if (customId.startsWith('help:nav:')) {
      const parts  = customId.split(':');
      const screen = parts[2]; // 'home' | 'category'
      const action = parts[3]; // 'first' | 'prev' | 'next' | 'last'

      if (screen === 'home') {
        let targetPage;
        if (action === 'first') {
          targetPage = 1;
        } else if (action === 'last') {
          const names = Object.keys(scanCommands());
          targetPage  = Math.max(1, Math.ceil(names.length / CATS_PER_PAGE));
        } else if (action === 'prev') {
          targetPage = Math.max(1, (parseInt(parts[4], 10) || 1) - 1);
        } else {
          targetPage = (parseInt(parts[4], 10) || 1) + 1;
        }
        return interaction.update(renderHelpHome(targetPage, botAvatarURL));
      }

      if (screen === 'category') {
        const category = parts[4];
        let targetPage;
        if (action === 'first') {
          targetPage = 1;
        } else if (action === 'last') {
          const cats = scanCommands();
          const cmds = cats[category] || [];
          targetPage  = Math.max(1, Math.ceil(cmds.length / CMDS_PER_PAGE));
        } else if (action === 'prev') {
          targetPage = Math.max(1, (parseInt(parts[5], 10) || 1) - 1);
        } else {
          targetPage = (parseInt(parts[5], 10) || 1) + 1;
        }
        return interaction.update(renderHelpCategory(category, targetPage));
      }
    }

    // ── Retour accueil depuis catégorie V2 (V2→embed impossible via update) ──
    if (customId === 'help:back_home') {
      await interaction.deferUpdate();
      await interaction.channel.send(renderHelpHome(1, botAvatarURL));
      await interaction.message.delete().catch(() => {});
      return;
    }

    // ── Bouton Rechercher → ouvre modal ──────────────────────────────────────
    if (customId === 'help:search') {
      const modal = new ModalBuilder()
        .setCustomId('help:search_submit')
        .setTitle('Rechercher une commande');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('query')
            .setLabel('Nom de la commande (sans le préfixe)')
            .setPlaceholder('ex: greeting, ticket, nuke...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50),
        ),
      );
      return interaction.showModal(modal);
    }

    // ── Soumission modal recherche ────────────────────────────────────────────
    if (customId === 'help:search_submit') {
      const raw = interaction.fields.getTextInputValue('query').trim().toLowerCase().replace(/^;/, '');
      const cmd = findCommand(raw);

      if (!cmd) {
        return interaction.reply({
          content: `✗ Aucune commande \`${raw}\` trouvée.`,
          flags  : MessageFlags.Ephemeral,
        });
      }

      const badges  = cmd.ownerOnly ? '\n👑 **Owner only**' : '';
      const aliases = cmd.aliases.length > 0
        ? `\n**Aliases :** ${cmd.aliases.map(a => `\`${a}\``).join(', ')}`
        : '';

      return interaction.reply({
        content:
          `## \`${cmd.usage}\`\n` +
          `**Catégorie :** ${cmd.category}\n` +
          `**Description :** ${cmd.description}${aliases}${badges}`,
        flags: MessageFlags.Ephemeral,
      });
    }

  } catch (err) {
    console.error('[help-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `✗ Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('help', (i) => handleHelpInteraction(i));
  client.selectHandlers.set('help', (i) => handleHelpInteraction(i));
  client.modalHandlers .set('help', (i) => handleHelpInteraction(i));
}

module.exports = { handleHelpInteraction, register };
