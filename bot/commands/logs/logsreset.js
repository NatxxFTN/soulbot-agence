'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const V3 = require('../../core/logs-v3-helper');
const {
  newContainer, buildHeader, separator, text, toV2Payload,
  infoEmbed, toEmbedReply, statusV2Panel,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name       : 'logsreset',
  aliases    : ['resetlogs', 'logsclear'],
  description: 'Réinitialiser entièrement la configuration des logs (avec confirmation).',
  usage      : ';logsreset',
  cooldown   : 10,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message) {
    const cfg = V3.getConfig(message.guild.id);
    if (!cfg.default_channel_id) {
      return message.reply(toEmbedReply(infoEmbed({
        title: 'Rien à réinitialiser',
        description: 'Aucune configuration de logs n\'existe sur ce serveur.',
        category: 'Logs V3',
      })));
    }

    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'btn_flag',
      title    : 'Réinitialiser les logs',
      subtitle : `Demande par **${message.author.tag}**`,
    });

    container.addTextDisplayComponents(
      text(`> ⚠️ **Action irréversible.** Toute la configuration logs va être supprimée.`),
    );
    container.addSeparatorComponents(separator('Small'));

    const totalEvents = Object.keys(V3.EVENT_TYPES).length;
    const enabledCount = Object.keys(V3.EVENT_TYPES).filter(t => V3.isEventEnabled(message.guild.id, t)).length;
    container.addTextDisplayComponents(
      text(
        `## Ce qui va se passer\n` +
        `• **Salon par défaut :** supprimé\n` +
        `• **Routing (par event) :** supprimé\n` +
        `• **Toggles (${totalEvents} events, ${enabledCount} actifs) :** remis à zéro\n` +
        `• **Filtres :** supprimés\n` +
        `• **Catégorie :** liée mais NON supprimée (suppression manuelle)\n` +
        `• Tu devras tout reconfigurer avec \`;logssetup\` ou \`;logsset\``,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('logs:reset:confirm')
        .setLabel('Réinitialiser')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('logs:reset:cancel')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary),
    );
    container.addActionRowComponents(row);

    container.addTextDisplayComponents(text(`-# Timeout 30s · Soulbot · Logs V3`));

    const prompt = await message.reply(toV2Payload(container));

    const collector = prompt.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time  : 30_000,
      max   : 1,
    });

    collector.on('collect', async interaction => {
      const [, , action] = interaction.customId.split(':');

      if (action === 'cancel') {
        return interaction.update(statusV2Panel({
          status: 'info',
          title: 'Annulé',
          description: 'Réinitialisation annulée.',
          category: 'Logs V3',
        }));
      }

      try {
        V3.resetConfig(message.guild.id);
      } catch (err) {
        return interaction.update(statusV2Panel({
          status: 'error',
          title: 'Erreur',
          description: `Impossible de réinitialiser : ${err.message}`,
          category: 'Logs V3',
        }));
      }

      return interaction.update(statusV2Panel({
        status: 'success',
        title: 'Logs réinitialisés',
        description:
          'La configuration a été entièrement supprimée.\n\n' +
          'Utilise `;logssetup` pour repartir à zéro avec auto-création complète.',
        category: 'Logs V3',
      }));
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await prompt.edit(statusV2Panel({
          status: 'warning',
          title: 'Temps écoulé',
          description: 'Confirmation non reçue — réinitialisation annulée.',
          category: 'Logs V3',
        })).catch(() => {});
      }
    });
  },
};
