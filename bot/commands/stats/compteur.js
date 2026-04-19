'use strict';

const { EmbedBuilder } = require('discord.js');
const { db }           = require('../../database');
const { formatDuration, formatNumber } = require('../../utils/format');
const E = require('../../utils/embeds');

module.exports = {
  name        : 'compteur',
  aliases     : ['counter', 'count'],
  description : 'Affiche un compteur global de l\'activité du serveur.',
  usage       : 'compteur',
  cooldown    : 5,

  guildOnly  : true,

  async execute(message, args, client) {
    const guildId = message.guild.id;

    // ── Totaux globaux ────────────────────────────────────────────────────────
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(messages),      0) AS messages,
        COALESCE(SUM(voice_seconds), 0) AS voice,
        COUNT(DISTINCT user_id)         AS users
      FROM user_stats WHERE guild_id = ?
    `).get(guildId);

    // ── Top salon par messages ─────────────────────────────────────────────────
    const topChannels = db.prepare(`
      SELECT channel_id, SUM(messages) AS total
      FROM user_channel_stats WHERE guild_id = ?
      GROUP BY channel_id ORDER BY total DESC LIMIT 5
    `).all(guildId);

    // ── Sessions vocales actives en ce moment ─────────────────────────────────
    const activeSessions = db.prepare(`
      SELECT COUNT(*) AS c FROM voice_sessions WHERE guild_id = ?
    `).get(guildId).c;

    // ── Utilisateurs avec activité dans les 7 derniers jours ─────────────────
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
    const recentUsers  = db.prepare(`
      SELECT COUNT(*) AS c FROM user_stats
      WHERE guild_id = ? AND last_message_at > ?
    `).get(guildId, sevenDaysAgo).c;

    // ── Construction des lignes de salons ─────────────────────────────────────
    const chanLines = topChannels.map((row, i) => {
      const ch = message.guild.channels.cache.get(row.channel_id);
      return `${i + 1}. ${ch ? `<#${ch.id}>` : row.channel_id} — **${formatNumber(row.total)}** messages`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(E.COLORS.PRIMARY)
      .setTitle(`🔢  Compteur — ${message.guild.name}`)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '💬 Messages totaux',      value: formatNumber(totals.messages),        inline: true },
        { name: '🎙️ Temps vocal total',    value: formatDuration(totals.voice),          inline: true },
        { name: '👥 Utilisateurs actifs',  value: formatNumber(totals.users),            inline: true },
        { name: '⚡ En vocal maintenant',  value: `${activeSessions} utilisateur(s)`,   inline: true },
        { name: '📆 Actifs (7j)',          value: `${recentUsers} utilisateur(s)`,       inline: true },
        { name: '👤 Membres totaux',       value: formatNumber(message.guild.memberCount), inline: true },
        { name: '🏆 Top 5 salons',         value: chanLines || '*Aucun salon enregistré*', inline: false },
      )
      .setFooter({ text: `Mis à jour le` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
