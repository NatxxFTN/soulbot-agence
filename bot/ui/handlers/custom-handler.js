'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/custom-commands-storage');
const { isReservedName } = require('../../core/reserved-command-names');

// ── Buttons ───────────────────────────────────────────────────────────────────

async function handleCustomInteraction(interaction, params, client) {
  const action = params[0];
  const arg    = params[1];

  if (!ac.hasAccess(interaction.guild.id, interaction.user.id)) {
    return interaction.reply({
      content: `${e('btn_error')} Tu n'as pas accès au bot.`,
      flags  : MessageFlags.Ephemeral,
    }).catch(() => {});
  }

  const { renderCustomPanel } = require('../panels/custom-panel');

  try {
    switch (action) {
      case 'add':          return showAddModal(interaction);
      case 'remove_menu':  return showRemoveMenu(interaction);
      case 'edit_menu':    return showEditMenu(interaction);
      case 'quickedit': {
        const cmd = storage.getCommandById(interaction.guild.id, Number(arg));
        if (!cmd) {
          return interaction.reply({ content: `${e('btn_error')} Commande introuvable.`, flags: MessageFlags.Ephemeral });
        }
        return showEditModal(interaction, cmd);
      }
      case 'prev':
      case 'next': {
        const currentPage = parseInt(arg, 10) || 0;
        const newPage     = action === 'prev' ? currentPage - 1 : currentPage + 1;
        const panel       = renderCustomPanel(interaction.guild, newPage, client);
        return interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      }
      case 'refresh': {
        const panel = renderCustomPanel(interaction.guild, 0, client);
        return interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      }
      case 'stats':
        return showStatsPanel(interaction);
      default:
        return;
    }
  } catch (err) {
    console.error('[custom-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${e('btn_error')} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

// ── Modals ────────────────────────────────────────────────────────────────────

async function showAddModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('custom_modal:add')
    .setTitle('Ajouter une commande custom')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('cmd_name')
          .setLabel('Nom (sans préfixe, ex: règles)')
          .setStyle(TextInputStyle.Short)
          .setMinLength(2).setMaxLength(32)
          .setRequired(true)
          .setPlaceholder('règles'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('cmd_response')
          .setLabel('Réponse (max 2000 chars)')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(2000)
          .setRequired(true)
          .setPlaceholder('**Règles :**\\n1. Respect\\n2. ...\\n\\nBienvenue {user} !'),
      ),
    );
  await interaction.showModal(modal);
}

async function showEditModal(interaction, cmd) {
  const current = cmd.response_type === 'text'
    ? (cmd.response_text || '')
    : (cmd.embed_data || '{}');

  const modal = new ModalBuilder()
    .setCustomId(`custom_modal:edit:${cmd.id}`)
    .setTitle(`Éditer ;${cmd.name}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('cmd_response')
          .setLabel('Nouvelle réponse')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(2000)
          .setRequired(true)
          .setValue(current.slice(0, 2000)),
      ),
    );
  await interaction.showModal(modal);
}

// ── Select menus ──────────────────────────────────────────────────────────────

async function showRemoveMenu(interaction) {
  const { items } = storage.listCommands(interaction.guild.id, 0, 25);
  if (items.length === 0) {
    return interaction.reply({
      content: `${e('btn_error')} Aucune commande à supprimer.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('custom_select:remove')
    .setPlaceholder('Choisis une commande à supprimer')
    .addOptions(items.map(cmd => ({
      label      : `;${cmd.name}`.slice(0, 100),
      description: `${cmd.uses_count} uses`.slice(0, 100),
      value      : String(cmd.id),
    })));

  await interaction.reply({
    content   : `${e('btn_trash')} Quelle commande supprimer ?`,
    components: [new ActionRowBuilder().addComponents(select)],
    flags     : MessageFlags.Ephemeral,
  });
}

async function showEditMenu(interaction) {
  const { items } = storage.listCommands(interaction.guild.id, 0, 25);
  if (items.length === 0) {
    return interaction.reply({
      content: `${e('btn_error')} Aucune commande à éditer.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('custom_select:edit')
    .setPlaceholder('Choisis une commande à éditer')
    .addOptions(items.map(cmd => ({
      label      : `;${cmd.name}`.slice(0, 100),
      description: `${cmd.uses_count} uses`.slice(0, 100),
      value      : String(cmd.id),
    })));

  await interaction.reply({
    content   : `${e('btn_edit')} Quelle commande éditer ?`,
    components: [new ActionRowBuilder().addComponents(select)],
    flags     : MessageFlags.Ephemeral,
  });
}

// ── Stats ephemeral ───────────────────────────────────────────────────────────

async function showStatsPanel(interaction) {
  const top       = storage.getTopCommands(interaction.guild.id, 10);
  const total     = storage.countCommands(interaction.guild.id);
  const usesMonth = storage.getTotalUsesThisMonth(interaction.guild.id);

  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_information')} **Stats Commandes Custom**`,
  ));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('ui_folder')} Total : **${total}/${storage.MAX_PER_GUILD}**\n` +
    `${e('cat_giveaway')} Uses ce mois : **${usesMonth}**`,
  ));

  if (top.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const lines  = top.map((c, i) => {
      const prefix = i < 3 ? medals[i] : `**${i + 1}.**`;
      return `${prefix} \`;${c.name}\` — **${c.uses_count}** uses`;
    });
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_owner')} **Top utilisées**\n${lines.join('\n')}`,
    ));
  }

  await interaction.reply({
    components: [container],
    flags     : MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  });
}

// ── Modal submit ──────────────────────────────────────────────────────────────

async function handleCustomModal(interaction, params, client) {
  const action = params[0];

  if (action === 'add') {
    const name     = interaction.fields.getTextInputValue('cmd_name').trim().toLowerCase();
    const response = interaction.fields.getTextInputValue('cmd_response');

    if (!storage.validateName(name)) {
      return interaction.reply({
        content: `${e('btn_error')} Nom invalide. Utilise 2-32 caractères \`[a-z 0-9 _ -]\`.`,
        flags  : MessageFlags.Ephemeral,
      });
    }
    if (isReservedName(client, name)) {
      return interaction.reply({
        content: `${e('btn_error')} \`;${name}\` est une commande native du bot.`,
        flags  : MessageFlags.Ephemeral,
      });
    }

    try {
      storage.createCommand(interaction.guild.id, name, 'text', { text: response }, interaction.user.id);
    } catch (err) {
      return interaction.reply({
        content: `${e('btn_error')} ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: `${e('btn_success')} \`;${name}\` créée ! Teste-la dans n'importe quel salon.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  if (action === 'edit') {
    const cmdId       = Number(params[1]);
    const newResponse = interaction.fields.getTextInputValue('cmd_response');
    const cmd = storage.getCommandById(interaction.guild.id, cmdId);
    if (!cmd) {
      return interaction.reply({
        content: `${e('btn_error')} Commande introuvable.`,
        flags  : MessageFlags.Ephemeral,
      });
    }

    try {
      storage.updateCommand(interaction.guild.id, cmd.name, 'text', { text: newResponse });
    } catch (err) {
      return interaction.reply({
        content: `${e('btn_error')} ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: `${e('btn_success')} \`;${cmd.name}\` mise à jour !`,
      flags  : MessageFlags.Ephemeral,
    });
  }
}

// ── Select submit ─────────────────────────────────────────────────────────────

async function handleCustomSelect(interaction, params) {
  const action = params[0];
  const cmdId  = Number(interaction.values[0]);
  const cmd    = storage.getCommandById(interaction.guild.id, cmdId);
  if (!cmd) {
    return interaction.reply({
      content: `${e('btn_error')} Commande introuvable.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  if (action === 'remove') {
    storage.deleteCommand(interaction.guild.id, cmd.name);
    return interaction.update({
      content: `${e('btn_trash')} \`;${cmd.name}\` supprimée.`,
      components: [],
    });
  }

  if (action === 'edit') {
    return showEditModal(interaction, cmd);
  }
}

module.exports = {
  handleCustomInteraction,
  handleCustomModal,
  handleCustomSelect,
};
