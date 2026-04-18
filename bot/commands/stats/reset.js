'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db } = require('../../database');
const E = require('../../utils/embeds');

/*
 * ;reset all stats
 * Réinitialise toutes les statistiques du serveur (avec confirmation).
 */
module.exports = {
  name        : 'reset',
  aliases     : [],
  description : 'Réinitialise les statistiques du serveur.',
  usage       : 'reset all stats',
  cooldown    : 10,
  permissions : ['Administrator'],

  async execute(message, args, client) {
    const guildId = message.guild.id;

    // Vérifier les sous-arguments "all stats"
    const sub = args.join(' ').toLowerCase();
    if (sub !== 'all stats' && sub !== 'allstats') {
      return message.reply({ embeds: [E.usage(';', 'reset all stats', 'Réinitialise **toutes** les statistiques du serveur.')] });
    }

    // ── Confirmation avec boutons ─────────────────────────────────────────────
    const statsCount = db.prepare('SELECT COUNT(*) AS c FROM user_stats WHERE guild_id = ?').get(guildId).c;
    const sessCount  = db.prepare('SELECT COUNT(*) AS c FROM voice_sessions WHERE guild_id = ?').get(guildId).c;

    const confirmEmbed = new EmbedBuilder()
      .setColor(E.COLORS.ERROR)
      .setTitle('⚠️  Confirmation requise')
      .setDescription(
        `Tu es sur le point de supprimer **toutes** les statistiques de ${message.guild.name} :\n\n` +
        `• **${statsCount}** entrées utilisateur\n` +
        `• **${sessCount}** session(s) vocale(s) active(s)\n\n` +
        `**Cette action est irréversible.**`
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_reset').setLabel('✅ Confirmer').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_reset').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
    );

    const reply = await message.reply({ embeds: [confirmEmbed], components: [row] });

    // ── Attente de la réponse (30s) ───────────────────────────────────────────
    const collector = reply.createMessageComponentCollector({
      componentType : ComponentType.Button,
      filter        : i => i.user.id === message.author.id,
      time          : 30_000,
      max           : 1,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'confirm_reset') {
        // Exécuter la réinitialisation dans une transaction
        const resetAll = db.transaction(() => {
          db.prepare('DELETE FROM user_stats WHERE guild_id = ?').run(guildId);
          db.prepare('DELETE FROM user_channel_stats WHERE guild_id = ?').run(guildId);
          db.prepare('DELETE FROM voice_sessions WHERE guild_id = ?').run(guildId);
          db.prepare('DELETE FROM star_reactions WHERE guild_id = ?').run(guildId);
          db.prepare('DELETE FROM starboard_entries WHERE guild_id = ?').run(guildId);
        });
        resetAll();

        await interaction.update({
          embeds     : [E.success('Réinitialisation effectuée', `Toutes les statistiques de **${message.guild.name}** ont été supprimées.`)],
          components : [],
        });
      } else {
        await interaction.update({
          embeds     : [E.info('Annulé', 'La réinitialisation a été annulée.')],
          components : [],
        });
      }
    });

    collector.on('end', (collected) => {
      if (!collected.size) {
        reply.edit({ components: [] }).catch(() => {});
      }
    });
  },
};
