'use strict';

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');
const {
  renderHelpPanel,
  renderHelpHome,
  renderHelpCategory,
  CATEGORIES_PER_PAGE,
  COMMANDS_PER_PAGE,
} = require('../panels/help-panel');
const { scanCommands, findCommand } = require('../../core/help-helper');

// ─── Helpers de transition Embed ↔ V2 ────────────────────────────────────────

// Embed → V2 : vide embeds pour que Discord accepte IS_COMPONENTS_V2
function gotoCategory(interaction, category, page) {
  return interaction.update({
    embeds: [],
    ...renderHelpCategory(category, page),
  });
}

// V2 → Embed : vide components + flags pour pouvoir remettre un Embed classique
function gotoHome(interaction, page, botAvatarURL) {
  return interaction.update({
    components: [],
    flags      : 0,
    ...renderHelpHome(page, botAvatarURL),
  });
}

// ─── Handler principal ────────────────────────────────────────────────────────

async function handleHelpInteraction(interaction) {
  const id           = interaction.customId;
  const botAvatarURL = interaction.client.user.displayAvatarURL({ size: 256, extension: 'png' });

  console.log(`[help-handler] customId="${id}"`);

  try {

    // ── h:c — Dropdown catégorie (home → cat OU cat → cat) ──────────────────
    if (id === 'h:c') {
      const category = interaction.values[0];
      console.log(`[help-handler] → Catégorie : ${category}`);
      return gotoCategory(interaction, category, 1);
    }

    // ── h:back — Retour accueil depuis V2 ───────────────────────────────────
    if (id === 'h:back') {
      console.log('[help-handler] → Retour accueil');
      return gotoHome(interaction, 1, botAvatarURL);
    }

    // ── h:src — Ouvre modal recherche ───────────────────────────────────────
    if (id === 'h:src') {
      const modal = new ModalBuilder()
        .setCustomId('h:src:s')
        .setTitle('Rechercher une commande');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('query')
            .setLabel('Nom de la commande')
            .setPlaceholder('ex: greeting, ticket, nuke')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50),
        ),
      );
      return interaction.showModal(modal);
    }

    // ── h:src:s — Soumission modal recherche ────────────────────────────────
    if (id === 'h:src:s') {
      const PREFIX = process.env.PREFIX || ';';
      const query  = interaction.fields.getTextInputValue('query')
        .trim().toLowerCase().replace(/^[;+!?]/, '');
      const cmd    = findCommand(query);

      if (!cmd) {
        return interaction.reply({
          content: `✗ Aucune commande \`${query}\` trouvée.\nTape \`${PREFIX}help\` pour la liste.`,
          flags  : MessageFlags.Ephemeral,
        });
      }

      const badges  = cmd.ownerOnly ? '\n👑 Owner only' : '';
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

    // ── Navigation accueil (home → home) ────────────────────────────────────
    if (id === 'h:h:f') {
      return interaction.update(renderHelpHome(1, botAvatarURL));
    }
    if (id === 'h:h:l') {
      const totalPages = Math.max(1, Math.ceil(Object.keys(scanCommands()).length / CATEGORIES_PER_PAGE));
      return interaction.update(renderHelpHome(totalPages, botAvatarURL));
    }
    if (id.startsWith('h:h:p:')) {
      const cur = parseInt(id.split(':')[3], 10) || 1;
      return interaction.update(renderHelpHome(Math.max(1, cur - 1), botAvatarURL));
    }
    if (id.startsWith('h:h:n:')) {
      const cur = parseInt(id.split(':')[3], 10) || 1;
      return interaction.update(renderHelpHome(cur + 1, botAvatarURL));
    }

    // ── Navigation catégorie (cat → cat) ────────────────────────────────────
    if (id.startsWith('h:cf:')) {
      const category = id.substring('h:cf:'.length);
      return interaction.update(renderHelpCategory(category, 1));
    }
    if (id.startsWith('h:cl:')) {
      const category  = id.substring('h:cl:'.length);
      const cmds      = (scanCommands()[category] || []);
      const totalPages = Math.max(1, Math.ceil(cmds.length / COMMANDS_PER_PAGE));
      return interaction.update(renderHelpCategory(category, totalPages));
    }
    if (id.startsWith('h:cp:')) {
      const parts    = id.substring('h:cp:'.length).split(':');
      const category = parts[0];
      const cur      = parseInt(parts[1], 10) || 1;
      return interaction.update(renderHelpCategory(category, Math.max(1, cur - 1)));
    }
    if (id.startsWith('h:cn:')) {
      const parts    = id.substring('h:cn:'.length).split(':');
      const category = parts[0];
      const cur      = parseInt(parts[1], 10) || 1;
      return interaction.update(renderHelpCategory(category, cur + 1));
    }

    // ── customId non reconnu ─────────────────────────────────────────────────
    console.warn(`[help-handler] customId NON RECONNU : "${id}"`);
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({
        content: `⚠️ Action non reconnue : \`${id}\``,
        flags  : MessageFlags.Ephemeral,
      });
    }

  } catch (err) {
    console.error('═══════════════════════════════════════');
    console.error('❌ ERREUR help-handler');
    console.error('CustomId :', id);
    console.error('User     :', interaction.user.tag);
    console.error('Message  :', err.message);
    console.error('Stack    :', err.stack);
    console.error('═══════════════════════════════════════');

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
