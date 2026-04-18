'use strict';

const { EmbedBuilder } = require('discord.js');
const { db }                        = require('../../database');
const { formatDuration, formatNumber, progressBar } = require('../../utils/format');
const E                             = require('../../utils/embeds');

module.exports = {
  name        : 'stats',
  aliases     : ['statistiques', 'stat'],
  description : 'Affiche les statistiques du serveur, d\'un utilisateur ou d\'un salon.',
  usage       : 'stats [best|channel|server|user] [@user|#channel] [messages|voc]',
  cooldown    : 5,

  async execute(message, args, client) {
    const sub     = (args[0] ?? 'server').toLowerCase();
    const guildId = message.guild.id;

    // ── ;stats server ─────────────────────────────────────────────────────────
    if (sub === 'server') {
      const totals = db.prepare(`
        SELECT
          COALESCE(SUM(messages),      0) AS total_messages,
          COALESCE(SUM(voice_seconds), 0) AS total_voice,
          COUNT(DISTINCT user_id)         AS active_users
        FROM user_stats WHERE guild_id = ?
      `).get(guildId);

      const topMsg = db.prepare(`
        SELECT user_id, messages FROM user_stats
        WHERE guild_id = ? ORDER BY messages DESC LIMIT 1
      `).get(guildId);

      const topVoc = db.prepare(`
        SELECT user_id, voice_seconds FROM user_stats
        WHERE guild_id = ? ORDER BY voice_seconds DESC LIMIT 1
      `).get(guildId);

      const topMsgUser = topMsg ? await client.users.fetch(topMsg.user_id).catch(() => null) : null;
      const topVocUser = topVoc ? await client.users.fetch(topVoc.user_id).catch(() => null) : null;

      const embed = new EmbedBuilder()
        .setColor(E.COLORS.PRIMARY)
        .setTitle(`📊  Statistiques de ${message.guild.name}`)
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '💬 Messages totaux',  value: formatNumber(totals.total_messages), inline: true },
          { name: '🎙️ Temps vocal total', value: formatDuration(totals.total_voice),  inline: true },
          { name: '👥 Membres actifs',    value: formatNumber(totals.active_users),    inline: true },
          { name: '👤 Membres',           value: formatNumber(message.guild.memberCount), inline: true },
          { name: '📅 Création',          value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '🏆 Top messages', value: topMsgUser ? `${topMsgUser.username} — ${formatNumber(topMsg.messages)}` : '*—*', inline: true },
          { name: '🏆 Top vocal',    value: topVocUser ? `${topVocUser.username} — ${formatDuration(topVoc.voice_seconds)}` : '*—*', inline: true },
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── ;stats user [@mention] ────────────────────────────────────────────────
    if (sub === 'user') {
      const target = message.mentions.members.first() ?? message.member;
      const row    = db.prepare('SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?').get(guildId, target.id);

      const rank = db.prepare(`
        SELECT COUNT(*) + 1 AS r FROM user_stats
        WHERE guild_id = ? AND messages > ?
      `).get(guildId, row?.messages ?? 0).r;

      const rankVoc = db.prepare(`
        SELECT COUNT(*) + 1 AS r FROM user_stats
        WHERE guild_id = ? AND voice_seconds > ?
      `).get(guildId, row?.voice_seconds ?? 0).r;

      const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM user_stats WHERE guild_id = ?').get(guildId).c;
      const msgBar  = progressBar(row?.messages ?? 0,      (db.prepare('SELECT MAX(messages) AS m FROM user_stats WHERE guild_id = ?').get(guildId).m ?? 1));
      const vocBar  = progressBar(row?.voice_seconds ?? 0, (db.prepare('SELECT MAX(voice_seconds) AS m FROM user_stats WHERE guild_id = ?').get(guildId).m ?? 1));

      const embed = new EmbedBuilder()
        .setColor(E.COLORS.PRIMARY)
        .setTitle(`📊  Stats de ${target.displayName}`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '💬 Messages',     value: `${formatNumber(row?.messages ?? 0)}\n${msgBar}\n🏆 Rang #${rank}/${totalUsers}`,      inline: true },
          { name: '🎙️ Temps vocal',  value: `${formatDuration(row?.voice_seconds ?? 0)}\n${vocBar}\n🏆 Rang #${rankVoc}/${totalUsers}`, inline: true },
          { name: '📅 Dernier msg',  value: row?.last_message_at ? `<t:${row.last_message_at}:R>` : '*Jamais*', inline: true },
          { name: '🎙️ Dernier vocal', value: row?.last_voice_at  ? `<t:${row.last_voice_at}:R>`  : '*Jamais*', inline: true },
          { name: '📅 A rejoint le', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`, inline: true },
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── ;stats best [messages|voc] ────────────────────────────────────────────
    if (sub === 'best') {
      const type     = (args[1] ?? 'messages').toLowerCase();
      const isVoice  = type === 'voc' || type === 'voice' || type === 'vocal';
      const field    = isVoice ? 'voice_seconds' : 'messages';
      const label    = isVoice ? '🎙️ Temps vocal' : '💬 Messages';

      const top10 = db.prepare(`
        SELECT user_id, ${field} AS score FROM user_stats
        WHERE guild_id = ? AND ${field} > 0
        ORDER BY ${field} DESC LIMIT 10
      `).all(guildId);

      const medals = ['🥇', '🥈', '🥉'];
      const lines  = await Promise.all(top10.map(async (row, i) => {
        const u     = await client.users.fetch(row.user_id).catch(() => null);
        const name  = u ? u.username : `Utilisateur inconnu`;
        const score = isVoice ? formatDuration(row.score) : formatNumber(row.score);
        return `${medals[i] ?? `\`${i + 1}.\``} **${name}** — ${score}`;
      }));

      const embed = new EmbedBuilder()
        .setColor(E.COLORS.GOLD)
        .setTitle(`🏆  Top ${top10.length} — ${label}`)
        .setDescription(lines.join('\n') || '*Aucune donnée disponible.*')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── ;stats channel [#salon] ───────────────────────────────────────────────
    if (sub === 'channel') {
      const channel = message.mentions.channels.first() ?? message.channel;

      const top10 = db.prepare(`
        SELECT user_id, messages FROM user_channel_stats
        WHERE guild_id = ? AND channel_id = ?
        ORDER BY messages DESC LIMIT 10
      `).all(guildId, channel.id);

      const total = db.prepare(`
        SELECT COALESCE(SUM(messages), 0) AS t FROM user_channel_stats
        WHERE guild_id = ? AND channel_id = ?
      `).get(guildId, channel.id).t;

      const medals = ['🥇', '🥈', '🥉'];
      const lines  = await Promise.all(top10.map(async (row, i) => {
        const u    = await client.users.fetch(row.user_id).catch(() => null);
        const name = u ? u.username : 'Inconnu';
        const pct  = total ? ((row.messages / total) * 100).toFixed(1) : '0';
        return `${medals[i] ?? `\`${i + 1}.\``} **${name}** — ${formatNumber(row.messages)} (${pct}%)`;
      }));

      const embed = new EmbedBuilder()
        .setColor(E.COLORS.PRIMARY)
        .setTitle(`📊  Stats de #${channel.name}`)
        .setDescription(lines.join('\n') || '*Aucune donnée disponible.*')
        .addFields({ name: '💬 Total messages', value: formatNumber(total), inline: true })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    return message.reply({ embeds: [E.usage(';', 'stats [best|channel|server|user] [@user|#channel] [messages|voc]', 'Affiche les statistiques du serveur.')] });
  },
};
