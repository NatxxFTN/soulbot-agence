'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// /template — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Affiche le template actuellement configuré dans un embed formaté.
// Vue synthétique : nombre de rôles, salons, logs, messages configurés.
// ═══════════════════════════════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { THEME } = require('../../config/theme');

const DEFAULT_TEMPLATE_PATH = path.join(__dirname, '../../templates/default.template.json');

module.exports = {
  name: 'template',
  description: 'Affiche les informations du template ServerForge configuré',
  options: [],
  permissions: ['Administrator'],
  guildOnly: true,

  /**
   * Exécution de la commande /template.
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

    // Charge le template
    let template;
    try {
      if (!fs.existsSync(DEFAULT_TEMPLATE_PATH)) {
        return interaction.editReply({
          embeds: [
            require('../../utils/embeds').error(
              'Template introuvable',
              'Le fichier `default.template.json` est manquant.'
            ),
          ],
        });
      }
      template = JSON.parse(fs.readFileSync(DEFAULT_TEMPLATE_PATH, 'utf-8'));
    } catch (err) {
      return interaction.editReply({
        embeds: [
          require('../../utils/embeds').error(
            'Erreur de chargement',
            `Impossible de lire le template : \`${err.message}\``
          ),
        ],
      });
    }

    // ── Comptes ──────────────────────────────────────────────────────────────
    const roleCount = template.roles?.length || 0;
    const categoryCount = template.categories?.length || 0;
    const channelCount = template.categories?.reduce(
      (s, c) => s + (c.channels?.length || 0), 0
    ) || 0;
    const logCount = template.logs?.enabled
      ? template.logs.channels?.length || 0
      : 0;
    const rulesCount = Array.isArray(template.rules?.rules)
      ? template.rules.rules.length
      : 0;

    // ── Types de rôles ──────────────────────────────────────────────────────
    const roleSummary = template.roles
      ?.filter(r => !r.separator)
      ?.map(r => `• ${r.name} — ${r.color || '#000000'} ${r.hoist ? '(affiché séparément)' : ''}`)
      ?.join('\n') || 'Aucun rôle';

    // ── Nombre de salons par catégorie ───────────────────────────────────────
    const categorySummary = template.categories
      ?.map(c => {
        const textCount = c.channels?.filter(ch => ch.type === 'text' || !ch.type).length || 0;
        const voiceCount = c.channels?.filter(ch => ch.type === 'voice').length || 0;
        return `• ${c.name} → ${textCount} textuel(s), ${voiceCount} vocal(aux)`;
      })
      ?.join('\n') || 'Aucune catégorie';

    // ── Événements logs ─────────────────────────────────────────────────────
    const logSummary = template.logs?.enabled
      ? template.logs.channels?.map(lc => {
          const events = Array.isArray(lc.events) ? lc.events.join(', ') : '—';
          return `• ${lc.name} → \`${events}\``;
        })?.join('\n') || 'Aucun log configuré'
      : '❌ Logs désactivés';

    // ── Points clés bienvenue ────────────────────────────────────────────────
    const welcomeInfo = template.welcome?.enabled
      ? `✅ Message de bienvenue : **${template.welcome.title?.replace(/\{server\}/g, interaction.guild.name) || 'Activé'}**`
      : '❌ Messages de bienvenue désactivés';

    const rulesInfo = template.rules?.enabled
      ? `✅ Règlement : **${rulesCount} règle(s)** configurée(s)`
      : '❌ Règlement désactivé';

    // ── Embed final ──────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(THEME.COLOR_PRIMARY)
      .setTitle(`${THEME.ICONS.SERVERFORGE} Template ServerForge`)
      .setDescription(`**Nom :** \`${template.meta?.name || 'Mon Serveur'}\``)
      .addFields(
        {
          name: '📊 Résumé',
          value: [
            `👥 **${roleCount}** rôle(s)`,
            `📁 **${categoryCount}** catégorie(s)`,
            `💬 **${channelCount}** salon(s)`,
            `📋 **${logCount}** salon(s) de logs`,
            `📖 **${rulesCount}** règle(s)`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '👑 Rôles',
          value: roleSummary.substring(0, 1024) || 'Aucun',
          inline: false,
        },
        {
          name: '📂 Catégories',
          value: categorySummary.substring(0, 1024) || 'Aucune',
          inline: false,
        },
        {
          name: '📋 Logs',
          value: logSummary.substring(0, 1024) || 'Aucun',
          inline: false,
        },
        {
          name: '💌 Messages',
          value: `${welcomeInfo}\n${rulesInfo}`,
          inline: false,
        },
      )
      .setFooter({ text: `Fichier: default.template.json · ${THEME.FOOTER_TEXT}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
