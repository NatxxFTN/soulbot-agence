'use strict';

const { MessageFlags } = require('discord.js');
const { buildModal }   = require('../components/modals');
const { renderHelpHome, renderHelpCategory } = require('../panels/help-panel');
const { findCommand }  = require('../../core/help-helper');

async function handleHelpInteraction(interaction) {
  const customId = interaction.customId;
  const parts    = customId.split(':'); // ['help', 'category'|'page'|'search'|..., ...]

  try {
    // ── Bouton Accueil / pagination accueil : help:home:<page> ──────────────
    if (parts[1] === 'home') {
      const page = parseInt(parts[2], 10) || 1;
      const botAvatarURL = interaction.client.user.displayAvatarURL({ size: 256, extension: 'png' });
      return interaction.update(renderHelpHome(page, botAvatarURL));
    }

    // ── Dropdown sélection catégorie ─────────────────────────────────────────
    if (customId === 'help:category') {
      return interaction.update(renderHelpCategory(interaction.values[0], 1));
    }

    // ── Pagination bouton : help:page:<category>:<page> ──────────────────────
    if (parts[1] === 'page') {
      const category = parts[2];
      const page     = parseInt(parts[3], 10) || 1;
      return interaction.update(renderHelpCategory(category, page));
    }

    // ── Bouton Rechercher → ouvre modal ──────────────────────────────────────
    if (customId === 'help:search') {
      return interaction.showModal(buildModal({
        customId: 'help:search_save',
        title   : 'Rechercher une commande',
        inputs  : [{
          id         : 'query',
          label      : 'Nom de la commande (sans le préfixe)',
          placeholder: 'ex: greeting, ticket, nuke...',
          maxLength  : 50,
          required   : true,
        }],
      }));
    }

    // ── Soumission modal recherche ────────────────────────────────────────────
    if (customId === 'help:search_save') {
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
