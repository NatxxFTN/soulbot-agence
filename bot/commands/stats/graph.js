'use strict';

const { EmbedBuilder } = require('discord.js');
const { db }           = require('../../database');
const { formatDuration, formatNumber } = require('../../utils/format');
const E = require('../../utils/embeds');

/*
 * Génère l'URL d'un graphique via QuickChart.io (gratuit, aucune dép native).
 * ;graph [messages|voc] [7d|30d|all]
 */
module.exports = {
  name        : 'graph',
  aliases     : ['graphique', 'chart'],
  description : 'Génère un graphique d\'activité (messages ou vocal).',
  usage       : 'graph [messages|voc] [7d|30d|all]',
  cooldown    : 10,

  guildOnly  : true,

  async execute(message, args, client) {
    const guildId = message.guild.id;

    const typeArg    = (args[0] ?? 'messages').toLowerCase();
    const periodArg  = (args[1] ?? 'all').toLowerCase();
    const isVoice    = typeArg === 'voc' || typeArg === 'voice' || typeArg === 'vocal';
    const field      = isVoice ? 'voice_seconds' : 'messages';
    const label      = isVoice ? 'Temps vocal (min)' : 'Messages';

    // ── Filtre temporel ───────────────────────────────────────────────────────
    let timeFilter = '';
    let timeLabel  = 'Tout';
    const now = Math.floor(Date.now() / 1000);
    if (periodArg === '7d')  { timeFilter = `AND last_message_at > ${now - 7 * 86400}`;   timeLabel = '7 derniers jours'; }
    if (periodArg === '30d') { timeFilter = `AND last_message_at > ${now - 30 * 86400}`;  timeLabel = '30 derniers jours'; }

    // ── Top 10 ────────────────────────────────────────────────────────────────
    const rows = db.prepare(`
      SELECT user_id, ${field} AS score FROM user_stats
      WHERE guild_id = ? AND ${field} > 0 ${timeFilter}
      ORDER BY ${field} DESC LIMIT 10
    `).all(guildId);

    if (!rows.length) {
      return message.reply({ embeds: [E.info('Aucune donnée', 'Pas encore de statistiques enregistrées pour cette période.')] });
    }

    // ── Résolution des noms ───────────────────────────────────────────────────
    const labels = [];
    const data   = [];
    for (const row of rows) {
      const u = await client.users.fetch(row.user_id).catch(() => null);
      labels.push(u ? u.username.slice(0, 12) : 'Inconnu');
      data.push(isVoice ? Math.floor(row.score / 60) : row.score); // secondes → minutes pour vocal
    }

    // ── Génération de l'URL QuickChart ────────────────────────────────────────
    const chartConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: 'rgba(88, 101, 242, 0.8)',
          borderColor    : 'rgba(88, 101, 242, 1)',
          borderWidth    : 1,
        }],
      },
      options: {
        plugins: {
          legend : { labels: { color: '#fff' } },
          title  : { display: true, text: `Top 10 — ${label} (${timeLabel})`, color: '#fff', font: { size: 16 } },
        },
        scales: {
          x: { ticks: { color: '#ccc' }, grid: { color: '#444' } },
          y: { ticks: { color: '#ccc' }, grid: { color: '#444' }, beginAtZero: true },
        },
      },
    };

    const chartUrl = `https://quickchart.io/chart?bkg=%232F3136&c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=350`;

    // ── Tableau texte en dessous ──────────────────────────────────────────────
    const lines = rows.map((row, i) => {
      const score = isVoice ? formatDuration(row.score) : formatNumber(row.score);
      return `\`${String(i + 1).padStart(2, ' ')}.\` **${labels[i]}** — ${score}`;
    });

    const embed = new EmbedBuilder()
      .setColor(E.COLORS.PRIMARY)
      .setTitle(`📈  Graphique — ${label}`)
      .setDescription(lines.join('\n'))
      .setImage(chartUrl)
      .setFooter({ text: `Période : ${timeLabel} • ${message.guild.name}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
