'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const { db } = require('../../database');

const STMT_TOP = db.prepare('SELECT user_id, xp, level FROM guild_xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ? OFFSET ?');
const STMT_COUNT = db.prepare('SELECT COUNT(*) AS n FROM guild_xp WHERE guild_id = ?');

const PAGE_SIZE = 10;

function panel(title, body, footer) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  if (footer) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footer));
  }
  return container;
}

function replyPanel(message, title, body, footer) {
  return message.reply({
    components: [panel(title, body, footer)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
}

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
      return replyPanel(message, `${e('cat_information')} **Leaderboard vide**`, 'Aucun XP pour ce serveur — utilise `;xpset @user <amount>`.');
    }

    const lines = rows.map((r, i) => {
      const rank = offset + i + 1;
      const tag = `\`#${String(rank).padStart(2, '0')}\``;
      const medal = rank <= 3 ? `**${tag}**` : tag;
      return `${medal} <@${r.user_id}> · Lvl **${r.level}** · **${r.xp.toLocaleString('fr-FR')}** XP`;
    });

    const totalPages = Math.ceil(n / PAGE_SIZE);

    return replyPanel(
      message,
      `${e('cat_level')} **Leaderboard XP — ${message.guild.name}**`,
      lines.join('\n'),
      `Page ${page}/${totalPages} · ${n} membres avec XP`,
    );
  },
};
