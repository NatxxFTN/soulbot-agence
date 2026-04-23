'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/bump-storage');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  name       : 'bumplb',
  aliases    : ['bumptop', 'bumpleaderboard', 'blb'],
  category   : 'utility',
  description: 'Classement des top bumpers du serveur.',
  usage      : ';bumplb [month|all]',
  cooldown   : 5,
  guildOnly  : true,

  async execute(message, args) {
    const guildId = message.guild.id;
    const mode    = args[0]?.toLowerCase() === 'month' ? 'month' : 'all';

    const top = mode === 'month'
      ? storage.getTopBumpersMonth(guildId, 10)
      : storage.getTopBumpers(guildId, 10);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('ani_diamond')} **Leaderboard Bump** ${e('ani_diamond')}\n` +
        `${e('cat_information')} ${mode === 'month' ? 'Ce mois' : 'All-time'}`,
      ),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    if (top.length === 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('btn_error')} Aucun bump enregistré${mode === 'month' ? ' ce mois' : ''}.\n` +
          `${e('btn_tip')} Tape \`/bump\` pour démarrer !`,
        ),
      );
    } else {
      const lines = top.map((t, i) => {
        const prefix = i < 3 ? MEDALS[i] : `**${i + 1}.**`;
        return `${prefix} <@${t.user_id}> — **${t.count}** bump${t.count > 1 ? 's' : ''}`;
      });
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(lines.join('\n')),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_help')} Bascule : \`;bumplb ${mode === 'all' ? 'month' : 'all'}\``,
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
