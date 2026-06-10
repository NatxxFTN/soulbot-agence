'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// /sf-status — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Affiche l'état de la dernière génération ServerForge sur le serveur actuel.
// ═══════════════════════════════════════════════════════════════════════════════

const { EmbedBuilder, MessageFlags } = require('discord.js');
const { THEME } = require('../../config/theme');
const { getLastGeneration } = require('../../core/serverforge/generator');
const logger = require('../../utils/logger');

module.exports = {
  name: 'sf-status',
  description: 'Affiche le statut de la dernière génération ServerForge',
  options: [],
  permissions: ['Administrator'],
  guildOnly: true,

  /**
   * Exécution de la commande /sf-status.
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction, args, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // ── Vérification contexte ────────────────────────────────────────────
    if (!interaction.inGuild()) {
      return interaction.editReply({
        content: '❌ Cette commande doit être utilisée dans **un serveur**.',
      });
    }
    if (!interaction.guild) {
      return interaction.editReply({
        content: '❌ Le bot n\'est pas dans ce serveur. Invite-le d\'abord.',
      });
    }

    // Récupère la dernière génération depuis la base
    const lastGen = getLastGeneration(interaction.guild.id);

    if (!lastGen) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(THEME.COLOR_INFO)
            .setTitle(`${THEME.ICONS.SERVERFORGE} ServerForge — Statut`)
            .setDescription(
              'Aucune génération trouvée pour ce serveur.\n\n' +
              'Utilise `/generate` pour générer la structure du serveur.'
            )
            .setFooter({ text: THEME.FOOTER_TEXT })
            .setTimestamp(),
        ],
      });
    }

    // Formatage de la date
    const genDate = new Date(lastGen.generated_at + 'Z');
    const dateStr = genDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Détermine le statut
    const success = lastGen.success === 1;
    const statusEmoji = success ? '✅' : '❌';
    const statusText = success ? 'Succès' : 'Échec partiel';

    const embed = new EmbedBuilder()
      .setColor(success ? THEME.COLOR_SUCCESS : THEME.COLOR_WARNING)
      .setTitle(`${THEME.ICONS.SERVERFORGE} ServerForge — Dernière génération`)
      .setDescription(`Serveur : **${lastGen.guild_name || interaction.guild.name}**`)
      .addFields(
        {
          name: '📅 Date',
          value: `\`${dateStr}\``,
          inline: true,
        },
        {
          name: '👤 Généré par',
          value: `<@${lastGen.generated_by}>`,
          inline: true,
        },
        {
          name: '📋 Template',
          value: `\`${lastGen.template_used || 'default'}\``,
          inline: true,
        },
        {
          name: '📊 Résultats',
          value: [
            `👥 **${lastGen.roles_created}** rôle(s) créé(s)`,
            `💬 **${lastGen.channels_created}** salon(s) créé(s)`,
            `📋 **${lastGen.logs_created}** salon(s) de logs créé(s)`,
            '',
            `**Statut :** ${statusEmoji} ${statusText}`,
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: THEME.FOOTER_TEXT })
      .setTimestamp();

    // Ajoute les erreurs si présentes
    if (lastGen.error_details) {
      embed.addFields({
        name: '⚠️ Erreurs',
        value: `\`\`\`\n${lastGen.error_details.substring(0, 1000)}\n\`\`\``,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
