'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// /sf-reset — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Supprime TOUS les salons, rôles et emojis du serveur actuel.
// Préserve @everyone et le rôle du bot.
//
// ⚠️ COMMANDE DANGEREUSE — réservée aux Administrateurs.
// Demande une confirmation en 2 étapes avant d'exécuter.
// ═══════════════════════════════════════════════════════════════════════════════

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, MessageFlags } = require('discord.js');
const { THEME } = require('../../config/theme');
const { resetGuild } = require('../../core/serverforge/generator');
const logger = require('../../utils/logger');

module.exports = {
  name: 'sf-reset',
  description: '⚠️ SUPPRIME tous les salons, rôles et emojis du serveur (irréversible)',
  options: [],
  permissions: ['Administrator'],
  guildOnly: true,

  /**
   * Exécution de la commande /sf-reset.
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction, args, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // ── Vérification contexte ──────────────────────────────────────────────
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

    // ── Vérifications ──────────────────────────────────────────────────────
    const member = interaction.member;
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.editReply({
        embeds: [
          require('../../utils/embeds').error(
            'Permission refusée',
            'Tu dois être **Administrateur** du serveur pour utiliser cette commande.'
          ),
        ],
      });
    }

    // ── ÉTAPE 1 : Première confirmation ──────────────────────────────────────
    const step1Row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('sf_reset_step2')
        .setLabel('⚠️ Oui, je veux continuer')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('sf_reset_cancel')
        .setLabel('✗ Annuler')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({
      embeds: [
        require('../../utils/embeds').error(
          '⚠️ RESET DU SERVEUR — Étape 1/2',
          `Tu es sur le point de **supprimer définitivement** tous les éléments du serveur **${interaction.guild.name}** :\n\n` +
          `• Tous les salons (textuels, vocaux, catégories)\n` +
          `• Tous les rôles (sauf @everyone et rôle du bot)\n` +
          `• Tous les emojis et stickers\n\n` +
          `**Cette action est irréversible et destructive.**\n\n` +
          `Clique sur "Oui, je veux continuer" pour l'étape 2.`
        ),
      ],
      components: [step1Row],
    });

    // Attente bouton étape 1
    const filter1 = (btnInt) => {
      return btnInt.user.id === interaction.user.id &&
        ['sf_reset_step2', 'sf_reset_cancel'].includes(btnInt.customId);
    };

    let confirmation1;
    try {
      confirmation1 = await interaction.channel.awaitMessageComponent({
        filter: filter1,
        time: 30000,
      });
    } catch {
      return interaction.editReply({
        embeds: [require('../../utils/embeds').error('Temps écoulé', 'La confirmation a expiré. Relance `/sf-reset` pour réessayer.')],
        components: [],
      });
    }

    if (confirmation1.customId === 'sf_reset_cancel') {
      return confirmation1.update({
        embeds: [require('../../utils/embeds').info('Annulé', 'Reset annulé. Aucune modification effectuée.')],
        components: [],
      });
    }

    // ── ÉTAPE 2 : Confirmation finale ────────────────────────────────────────
    const step2Row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('sf_reset_final')
        .setLabel('💣 EXÉCUTER LE RESET')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('sf_reset_cancel')
        .setLabel('✗ Annuler')
        .setStyle(ButtonStyle.Secondary),
    );

    await confirmation1.update({
      embeds: [
        require('../../utils/embeds').error(
          '💣 RESET DU SERVEUR — Étape 2/2 (DERNIÈRE CHANCE)',
          `⚠️ **CONFIRMATION FINALE — Cette action est irréversible.**\n\n` +
          `Serveur : **${interaction.guild.name}**\n` +
          `Initié par : ${interaction.user.toString()}\n\n` +
          `**Processus :**\n` +
          `1. Suppression de tous les salons\n` +
          `2. Suppression de tous les rôles\n` +
          `3. Suppression de tous les emojis\n\n` +
          `⏱️ Durée estimée : **1 à 3 minutes**\n\n` +
          `La dernière chance d'annuler est maintenant.`
        ),
      ],
      components: [step2Row],
    });

    // Attente bouton étape 2
    const filter2 = (btnInt) => {
      return btnInt.user.id === interaction.user.id &&
        ['sf_reset_final', 'sf_reset_cancel'].includes(btnInt.customId);
    };

    let confirmation2;
    try {
      confirmation2 = await confirmation1.channel.awaitMessageComponent({
        filter: filter2,
        time: 30000,
      });
    } catch {
      return interaction.editReply({
        embeds: [require('../../utils/embeds').error('Temps écoulé', 'La confirmation a expiré. Relance `/sf-reset` pour réessayer.')],
        components: [],
      });
    }

    if (confirmation2.customId === 'sf_reset_cancel') {
      return confirmation2.update({
        embeds: [require('../../utils/embeds').info('Annulé', 'Reset annulé. Aucune modification effectuée.')],
        components: [],
      });
    }

    // ── EXÉCUTION DU RESET ──────────────────────────────────────────────────
    await confirmation2.update({
      embeds: [
        require('../../utils/embeds').info(
          '💣 Reset en cours...',
          'Suppression de tous les salons, rôles et emojis...\nCela peut prendre 1 à 3 minutes.'
        ),
      ],
      components: [],
    });

    logger.info('ServerForge:Reset',
      `Reset du serveur "${interaction.guild.name}" par ${interaction.user.tag}`
    );

    const startTime = Date.now();

    try {
      const result = await resetGuild(interaction.guild, (message) => {
        // Mise à jour de progression (best-effort, le salon peut être supprimé)
        confirmation2.editReply({
          embeds: [
            require('../../utils/embeds').info('💣 Reset en cours...', message),
          ],
        }).catch(() => {});
      });

      const duration = Math.floor((Date.now() - startTime) / 1000);

      // Log en base
      try {
        const { db } = require('../../database');
        db.prepare(`
          INSERT INTO reset_logs
            (guild_id, guild_name, user_id, auto_backup_name,
             channels_deleted, roles_deleted, emojis_deleted, duration_ms, success, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          interaction.guild.id,
          interaction.guild.name,
          interaction.user.id,
          'sf-reset-manual',
          0, // On ne compte pas précisément ici
          0,
          0,
          duration * 1000,
          result.errors.length === 0 ? 1 : 0,
          Date.now()
        );
      } catch { /* DB peut être indisponible */ }

      // Résultat
      const successMsg = result.errors.length === 0
        ? `✅ Reset terminé en **${duration}s**.\nLe serveur est vide, prêt à être régénéré avec \`/generate\`.`
        : `⚠️ Reset terminé en **${duration}s** avec **${result.errors.length}** erreur(s).\nCertains éléments n'ont pas pu être supprimés.`;

      try {
        await confirmation2.editReply({
          embeds: [
            require('../../utils/embeds').success('Reset terminé', successMsg),
          ],
        });
      } catch { /* salon probablement supprimé */ }

      // DM de résultat
      try {
        await interaction.user.send({
          embeds: [
            require('../../utils/embeds').success('✓ Reset terminé', successMsg),
          ],
        });
      } catch { /* DM fermés */ }

    } catch (err) {
      logger.errorStack('ServerForge:Reset', err);
      try {
        await confirmation2.editReply({
          embeds: [
            require('../../utils/embeds').error(
              'Erreur critique',
              `Le reset a échoué : \`${err.message}\`\n\nVérifie les permissions du bot et réessaie.`
            ),
          ],
        });
      } catch { /* salon supprimé */ }
    }
  },
};
