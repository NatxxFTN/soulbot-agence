'use strict';

const { db }                        = require('../../database');
const { formatDuration, formatNumber, progressBar } = require('../../utils/format');
const { e }                         = require('../../core/emojis');
const V2                            = require('./_components-v2');

module.exports = {
  name        : 'stats',
  aliases     : ['statistiques', 'stat'],
  description : 'Affiche les statistiques du serveur, d\'un utilisateur ou d\'un salon.',
  usage       : 'stats [best|channel|server|user] [@user|#channel] [messages|voc]',
  cooldown    : 5,

  guildOnly  : true,

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

      return V2.reply(message, V2.panel(
        `${e('cat_information')} **Statistiques de ${message.guild.name}**`,
        V2.fieldBlock([
          { name: `${e('ui_chat')} Messages totaux`, value: formatNumber(totals.total_messages) },
          { name: `${e('ui_mic')} Temps vocal total`, value: formatDuration(totals.total_voice) },
          { name: `${e('ui_members')} Membres actifs`, value: formatNumber(totals.active_users) },
          { name: `${e('ui_user')} Membres`, value: formatNumber(message.guild.memberCount) },
          { name: `${e('btn_calendar')} Création`, value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:D>` },
          { name: 'Top messages', value: topMsgUser ? `${topMsgUser.username} — ${formatNumber(topMsg.messages)}` : '*—*' },
          { name: 'Top vocal', value: topVocUser ? `${topVocUser.username} — ${formatDuration(topVoc.voice_seconds)}` : '*—*' },
        ]),
      ));
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

      return V2.reply(message, V2.panel(
        `${e('cat_information')} **Stats de ${target.displayName}**`,
        V2.fieldBlock([
          { name: `${e('ui_chat')} Messages`, value: `${formatNumber(row?.messages ?? 0)}\n${msgBar}\nRang #${rank}/${totalUsers}` },
          { name: `${e('ui_mic')} Temps vocal`, value: `${formatDuration(row?.voice_seconds ?? 0)}\n${vocBar}\nRang #${rankVoc}/${totalUsers}` },
          { name: `${e('btn_calendar')} Dernier msg`, value: row?.last_message_at ? `<t:${row.last_message_at}:R>` : '*Jamais*' },
          { name: `${e('ui_mic')} Dernier vocal`, value: row?.last_voice_at ? `<t:${row.last_voice_at}:R>` : '*Jamais*' },
          { name: `${e('btn_calendar')} A rejoint le`, value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>` },
        ]),
      ));
    }

    // ── ;stats best [messages|voc] ────────────────────────────────────────────
    if (sub === 'best') {
      const type     = (args[1] ?? 'messages').toLowerCase();
      const isVoice  = type === 'voc' || type === 'voice' || type === 'vocal';
      const field    = isVoice ? 'voice_seconds' : 'messages';
      const label    = isVoice ? `${e('ui_mic')} Temps vocal` : `${e('ui_chat')} Messages`;

      const top10 = db.prepare(`
        SELECT user_id, ${field} AS score FROM user_stats
        WHERE guild_id = ? AND ${field} > 0
        ORDER BY ${field} DESC LIMIT 10
      `).all(guildId);

      const lines  = await Promise.all(top10.map(async (row, i) => {
        const u     = await client.users.fetch(row.user_id).catch(() => null);
        const name  = u ? u.username : `Utilisateur inconnu`;
        const score = isVoice ? formatDuration(row.score) : formatNumber(row.score);
        return `\`${i + 1}.\` **${name}** — ${score}`;
      }));

      return V2.reply(message, V2.panel(
        `**Top ${top10.length} — ${label}**`,
        lines.join('\n') || '*Aucune donnée disponible.*',
        { footer: message.guild.name },
      ));
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

      const lines  = await Promise.all(top10.map(async (row, i) => {
        const u    = await client.users.fetch(row.user_id).catch(() => null);
        const name = u ? u.username : 'Inconnu';
        const pct  = total ? ((row.messages / total) * 100).toFixed(1) : '0';
        return `\`${i + 1}.\` **${name}** — ${formatNumber(row.messages)} (${pct}%)`;
      }));

      return V2.reply(message, V2.panel(
        `${e('cat_information')} **Stats de #${channel.name}**`,
        `${lines.join('\n') || '*Aucune donnée disponible.*'}\n\n**${e('ui_chat')} Total messages**\n${formatNumber(total)}`,
      ));
    }

    return V2.reply(message, V2.usage(';', 'stats [best|channel|server|user] [@user|#channel] [messages|voc]', 'Affiche les statistiques du serveur.'));
  },
};
