'use strict';

// POURQUOI ce fichier était absent [HAUTE] : sans lui, toute interaction
// (slash command, bouton, modal, autocomplete) tombait dans le vide.
// Le client reçoit l'event mais aucun handler ne le traitait.
// Référence : AUDITOR_CRITICAL_POINTS.md §2 — Events manquants

const { InteractionType, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    // ── Slash Commands ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands?.get(interaction.commandName);
      if (!cmd) {
        logger.warn('InteractionCreate', `Slash command inconnue : ${interaction.commandName}`);
        return interaction.reply({
          content: '✗ Commande inconnue.',
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        await cmd.execute(interaction, [], client, client.db);
      } catch (err) {
        logger.errorStack('InteractionCreate:SlashCmd', err);

        const payload = {
          content: '✗ Une erreur interne est survenue.',
          flags: MessageFlags.Ephemeral,
        };

        // POURQUOI vérifier isReplied / isDeferred : si execute() a déjà répondu
        // ou différé, un second reply lancerait une exception Discord "already replied".
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ── Autocomplete ────────────────────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      const cmd = client.commands?.get(interaction.commandName);
      if (!cmd?.autocomplete) return;

      try {
        await cmd.autocomplete(interaction, client, client.db);
      } catch (err) {
        logger.errorStack('InteractionCreate:Autocomplete', err);
        // POURQUOI respond([]) et non throw : une erreur autocomplete ne doit
        // pas remonter. L'utilisateur voit juste une liste vide, pas un crash.
        await interaction.respond([]).catch(() => {});
      }
      return;
    }

    // ── Boutons ─────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      // Protocole customId : "action:param1:param2"
      // Exemple : "poll_vote:42:1" → action=poll_vote, pollId=42, optIndex=1
      const [action, ...params] = interaction.customId.split(':');

      // Recherche d'un handler enregistré pour cette action
      const handler = client.buttonHandlers?.get(action);
      if (!handler) {
        // POURQUOI deferUpdate et non reply : les boutons sans handler global
        // sont gérés par des message component collectors (ex: help, poll).
        // Un reply() ici consommerait l'interaction avant que le collector
        // puisse appeler update() — provoquant "Unknown Interaction".
        // deferUpdate() acquitte l'interaction silencieusement (pas de loading,
        // pas de changement visible) et laisse le collector faire editReply().
        return interaction.deferUpdate().catch(() => {});
      }

      try {
        await handler(interaction, params, client, client.db);
      } catch (err) {
        logger.errorStack(`InteractionCreate:Button:${action}`, err);
        const payload = { content: "✗ Erreur lors de l'action.", flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ── Modals ──────────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const [action, ...params] = interaction.customId.split(':');
      const handler = client.modalHandlers?.get(action);
      if (!handler) return;

      try {
        await handler(interaction, params, client, client.db);
      } catch (err) {
        logger.errorStack(`InteractionCreate:Modal:${action}`, err);
        const payload = { content: '✗ Erreur lors du traitement du formulaire.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ── Select Menus ────────────────────────────────────────────────────────
    if (interaction.isAnySelectMenu()) {
      const [action, ...params] = interaction.customId.split(':');
      const handler = client.selectHandlers?.get(action);
      if (!handler) return;

      try {
        await handler(interaction, params, client, client.db);
      } catch (err) {
        logger.errorStack(`InteractionCreate:Select:${action}`, err);
      }
    }
  },
};
