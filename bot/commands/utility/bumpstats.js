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
  name       : 'bumpstats',
  aliases    : ['bstats', 'bumpinfo'],
  category   : 'utility',
  description: 'Statistiques complètes des bumps Disboard.',
  usage      : ';bumpstats',
  cooldown   : 5,
  guildOnly  : true,

  async execute(message) {
    const guildId = message.guild.id;

    const total     = storage.getTotalBumps(guildId);
    const unique    = storage.getUniqueBumpers(guildId);
    const firstBump = storage.getFirstBump(guildId);
    const lastBump  = storage.getLastBump(guildId);
    const nextBump  = storage.getNextBump(guildId);
    const topAll    = storage.getTopBumpers(guildId, 3);
    const topMonth  = storage.getTopBumpersMonth(guildId, 3);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('ani_diamond')} **Statistiques Bump** ${e('ani_diamond')}`,
      ),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    // ── Global ──────────────────────────────────────────────────────────────
    const firstLine = firstBump
      ? `${e('ui_pin')} Premier bump : <t:${Math.floor(firstBump / 1000)}:R>`
      : `${e('ui_pin')} Premier bump : *aucun*`;

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('cat_information')} **Global**\n` +
        `${e('ui_folder')} Total bumps : **${total}**\n` +
        `${e('ui_members')} Bumpers uniques : **${unique}**\n` +
        firstLine,
      ),
    );

    // ── Dernier bump ────────────────────────────────────────────────────────
    if (lastBump) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ui_pin')} **Dernier bump**\n` +
          `Par <@${lastBump.user_id}> <t:${Math.floor(lastBump.bumped_at / 1000)}:R>`,
        ),
      );
    }

    // ── Prochain bump ───────────────────────────────────────────────────────
    if (nextBump && nextBump.next_bump_at > Date.now()) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('btn_tip')} **Prochain bump** : <t:${Math.floor(nextBump.next_bump_at / 1000)}:R>`,
        ),
      );
    } else if (total > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('btn_success')} **Bump disponible maintenant !** Tape \`/bump\``,
        ),
      );
    }

    // ── Top 3 all-time ──────────────────────────────────────────────────────
    if (topAll.length > 0) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );
      const topText = topAll
        .map((t, i) => `${MEDALS[i]} <@${t.user_id}> — **${t.count}** bump${t.count > 1 ? 's' : ''}`)
        .join('\n');
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ani_diamond')} **Top 3 all-time**\n${topText}`,
        ),
      );
    }

    // ── Top 3 du mois ───────────────────────────────────────────────────────
    if (topMonth.length > 0) {
      const topText = topMonth
        .map((t, i) => `${MEDALS[i]} <@${t.user_id}> — **${t.count}** bump${t.count > 1 ? 's' : ''}`)
        .join('\n');
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('cat_giveaway')} **Top 3 ce mois**\n${topText}`,
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_help')} Leaderboard complet : \`;bumplb\``,
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
