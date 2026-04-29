'use strict';

const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_TOP = db.prepare('SELECT user_id, xp, level FROM guild_xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ? OFFSET ?');
const STMT_COUNT = db.prepare('SELECT COUNT(*) AS n FROM guild_xp WHERE guild_id = ?');

const PAGE_SIZE = 10;

module.exports = {
  name       : 'levelboard',
  aliases    : ['leaderboard', 'lvlboard', 'xpboard'],
  description: 'Leaderboard XP du serveur.',
  usage      : ';levelboard [page]',
  cooldown   : 5,
  guildOnly  : true,

  async execute(message, args) {
    const page = Math.max(1, parseInt(args[0], 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;
    const rows = STMT_TOP.all(message.guild.id, PAGE_SIZE, offset);
    const { n } = STMT_COUNT.get(message.guild.id);

    if (!rows.length) {
      return message.reply({ embeds: [E.info('Leaderboard vide', 'Aucun XP pour ce serveur — utilise `;xpset @user <amount>`.')] });
    }

    const lines = rows.map((r, i) => {
      const rank = offset + i + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`#${String(rank).padStart(2, '0')}\``;
      return `${medal} <@${r.user_id}> · Lvl **${r.level}** · **${r.xp.toLocaleString('fr-FR')}** XP`;
    });

    const totalPages = Math.ceil(n / PAGE_SIZE);

    return message.reply({
      embeds: [E.base()
        .setTitle(`🏆 Leaderboard XP — ${message.guild.name}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Page ${page}/${totalPages} · ${n} membres avec XP` })
      ],
    });
  },
};
