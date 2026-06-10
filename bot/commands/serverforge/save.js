'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /save — ServerForge
 * ═══════════════════════════════════════════════════════════════════════════════
 * Sauvegarde la structure d'un serveur comme template réutilisable.
 *
 * Deux modes :
 *   1. Dans un serveur → scanne les rôles/salons/permissions directement
 *   2. Avec un code template → récupère la structure via l'API Discord
 *      (sans que le bot soit dans le serveur !)
 *
 * Pour avoir un code template :
 *   Paramètres du serveur → Server Template → Create Template
 *   → donne le lien (discord.new/xxx) à la commande
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const { THEME } = require('../../config/theme');
const { scanServer, scanTemplateCode, saveTemplate, listTemplates } = require('../../core/serverforge/serverScanner');
const logger = require('../../utils/logger');

module.exports = {
  name: 'save',
  description: '📋 Sauvegarde la structure d\'un serveur comme template réutilisable',
  options: [
    {
      name: 'nom',
      description: 'Nom à donner au template',
      type: 3, // STRING
      required: true,
    },
    {
      name: 'code',
      description: 'Code template Discord (discord.new/xxx) — scanne sans que le bot soit dans le serveur',
      type: 3, // STRING
      required: false,
    },
  ],

  /**
   * Exécution de la commande /save.
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction, args, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const templateName = interaction.options.getString('nom', true);
    const templateCode = interaction.options.getString('code');

    // ── Vérification du nom ──────────────────────────────────────────────
    if (!/^[a-zA-Z0-9-_ ]+$/.test(templateName)) {
      return interaction.editReply({
        content: '❌ Nom invalide. Utilise lettres, chiffres et tirets.\nExemple : `mon-serveur-v2`',
      });
    }

    // ── Vérifie si le template existe déjà ───────────────────────────────
    const safeName = templateName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
    const existing = listTemplates().find(t => t.name === safeName);
    if (existing) {
      return interaction.editReply({
        content: `❌ Un template \`${safeName}\` existe déjà. Choisis un autre nom.`,
      });
    }

    // ── MODE 2 : Code template Discord (sans le bot dans le serveur) ────
    if (templateCode) {
      return handleTemplateCode(interaction, templateName, safeName, templateCode);
    }

    // ── MODE 1 : Scan du serveur actuel (bot présent) ────────────────────
    return handleScanGuild(interaction, templateName, safeName);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 1 : Scan du serveur actuel
// ═══════════════════════════════════════════════════════════════════════════════

async function handleScanGuild(interaction, templateName, safeName) {
  if (!interaction.inGuild() || !interaction.guild) {
    return interaction.editReply({
      content: '❌ Pour scanner le serveur actuel, utilise cette commande **dans un serveur**.\nOu ajoute `code:` pour scanner via un code template Discord.',
    });
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(THEME.COLOR_INFO)
        .setTitle('📋 Scan du serveur en cours...')
        .setDescription(`Analyse de **${interaction.guild.name}**...`)
        .setFooter({ text: THEME.FOOTER_TEXT }),
    ],
  });

  try {
    const template = await scanServer(interaction.guild);
    const filePath = saveTemplate(templateName, template);

    const roleCount = template.roles.length;
    const channelCount = template.categories.reduce((s, c) => s + c.channels.length, 0);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(THEME.COLOR_SUCCESS)
          .setTitle('✅ Serveur sauvegardé !')
          .setDescription(
            `**${interaction.guild.name}** scanné et sauvegardé.\n\n` +
            `👥 **${roleCount}** rôle(s)\n` +
            `💬 **${channelCount}** salon(s)\n\n` +
            `📝 \`${filePath.split('\\').pop().split('/').pop()}\`\n\n` +
            `Utilise \`/generate\` pour recréer cette structure !`
          )
          .setFooter({ text: THEME.FOOTER_TEXT })
          .setTimestamp(),
      ],
    });
  } catch (err) {
    logger.errorStack('ServerForge:Save', err);
    await interaction.editReply({
      embeds: [require('../../utils/embeds').error('❌ Erreur', `\`${err.message}\``)],
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 2 : Scan via code template Discord (sans le bot dans le serveur !)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleTemplateCode(interaction, templateName, safeName, code) {
  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(THEME.COLOR_INFO)
        .setTitle('📋 Récupération du template Discord...')
        .setDescription(
          `Téléchargement de la structure depuis le code \`${code}\`...\n\n` +
          '⏱️ Quelques secondes...'
        )
        .setFooter({ text: THEME.FOOTER_TEXT }),
    ],
  });

  try {
    // ── Récupère le template via l'API Discord (publique) ───────────────
    const template = await scanTemplateCode(code);

    // ── Sauvegarde ──────────────────────────────────────────────────────
    const filePath = saveTemplate(templateName, template);
    const fileName = filePath.split('\\').pop().split('/').pop();

    // ── Stats ───────────────────────────────────────────────────────────
    const roleCount = template.roles.length;
    const catCount = template.categories.length;
    const channelCount = template.categories.reduce((s, c) => s + c.channels.length, 0);

    // ── Résultat ────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(THEME.COLOR_SUCCESS)
      .setTitle('✅ Template récupéré !')
      .setDescription(
        `Structure de **${template.meta.name}** sauvegardée **sans que le bot soit dans le serveur** ! 🎉\n\n` +
        `**📊 Résumé :**\n` +
        `• 👥 **${roleCount}** rôle(s)\n` +
        `• 📁 **${catCount}** catégorie(s)\n` +
        `• 💬 **${channelCount}** salon(s)\n\n` +
        `**📝 Fichier :** \`${fileName}\`\n\n` +
        `**🔗 Pour générer ce serveur :**\n` +
        `\`/generate name:"${template.meta.name}"\`\n\n` +
        `> ⚠️ Les permissions personnalisées ne sont pas incluses dans les templates Discord.`
      )
      .setFooter({ text: THEME.FOOTER_TEXT })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info('ServerForge:Save',
      `Template "${templateName}" récupéré via code Discord: ` +
      `${roleCount} rôles, ${channelCount} salons`
    );

  } catch (err) {
    logger.errorStack('ServerForge:Save', err);
    await interaction.editReply({
      embeds: [
        require('../../utils/embeds').error(
          '❌ Erreur',
          `${err.message}\n\n` +
          'Vérifie que le code template est valide.\n' +
          'Va dans Paramètres → Server Template → Create Template sur le serveur cible.'
        ),
      ],
    });
  }
}
