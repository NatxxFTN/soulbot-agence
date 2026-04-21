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
  const id           = interaction.customId;
  const botAvatarURL = interaction.client.user.displayAvatarURL({ size: 256, extension: 'png' });

  try {

    // ── h:cat — Dropdown sélection catégorie ─────────────────────────────────
    if (id === 'h:cat') {
      return interaction.update(renderHelpCategory(interaction.values[0], 1));
    }

    // ── h:back — Retour accueil depuis V2 (transition V2→embed) ──────────────
    if (id === 'h:back') {
      await interaction.deferUpdate();
      await interaction.channel.send(renderHelpHome(1, botAvatarURL));
      await interaction.message.delete().catch(() => {});
      return;
    }

    // ── h:search — Ouvre modal recherche ─────────────────────────────────────
    if (id === 'h:search') {
      const modal = new ModalBuilder()
        .setCustomId('h:sq')
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

    // ── h:sq — Soumission modal recherche ────────────────────────────────────
    if (id === 'h:sq') {
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

    // ── Navigation accueil : h:hf · h:hp:<p> · h:hn:<p> · h:hl ─────────────
    if (id === 'h:hf') {
      return interaction.update(renderHelpHome(1, botAvatarURL));
    }
    if (id === 'h:hl') {
      const names = Object.keys(scanCommands());
      const last  = Math.max(1, Math.ceil(names.length / CATS_PER_PAGE));
      return interaction.update(renderHelpHome(last, botAvatarURL));
    }
    if (id.startsWith('h:hp:')) {
      const cur  = parseInt(id.split(':')[2], 10) || 1;
      return interaction.update(renderHelpHome(Math.max(1, cur - 1), botAvatarURL));
    }
    if (id.startsWith('h:hn:')) {
      const cur  = parseInt(id.split(':')[2], 10) || 1;
      return interaction.update(renderHelpHome(cur + 1, botAvatarURL));
    }

    // ── Navigation catégorie : h:cf · h:cp · h:cn · h:cl ───────────────────
    if (id.startsWith('h:cf:')) {
      const cat = decodeURIComponent(id.slice(5));
      return interaction.update(renderHelpCategory(cat, 1));
    }
    if (id.startsWith('h:cl:')) {
      const cat  = decodeURIComponent(id.slice(5));
      const cats = scanCommands();
      const cmds = cats[cat] || [];
      const last = Math.max(1, Math.ceil(cmds.length / CMDS_PER_PAGE));
      return interaction.update(renderHelpCategory(cat, last));
    }
    if (id.startsWith('h:cp:')) {
      // h:cp:<cat>:<page>
      const parts = id.split(':');
      const cat   = decodeURIComponent(parts[2]);
      const cur   = parseInt(parts[3], 10) || 1;
      return interaction.update(renderHelpCategory(cat, Math.max(1, cur - 1)));
    }
    if (id.startsWith('h:cn:')) {
      // h:cn:<cat>:<page>
      const parts = id.split(':');
      const cat   = decodeURIComponent(parts[2]);
      const cur   = parseInt(parts[3], 10) || 1;
      return interaction.update(renderHelpCategory(cat, cur + 1));
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
  client.buttonHandlers.set('h', (i) => handleHelpInteraction(i));
  client.selectHandlers.set('h', (i) => handleHelpInteraction(i));
  client.modalHandlers .set('h', (i) => handleHelpInteraction(i));
}

module.exports = { handleHelpInteraction, register };
