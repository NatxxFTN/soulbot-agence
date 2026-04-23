'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/bump-storage');

module.exports = {
  name       : 'bump',
  aliases    : ['b', 'disboard'],
  category   : 'utility',
  description: 'Voir le statut du bump Disboard et comment bump.',
  usage      : ';bump',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message) {
    const guildId  = message.guild.id;
    const userId   = message.author.id;

    const lastBump   = storage.getLastBump(guildId);
    const nextBump   = storage.getNextBump(guildId);
    const totalBumps = storage.getTotalBumps(guildId);
    const userBumps  = storage.getUserBumps(guildId, userId);
    const config     = storage.getConfig(guildId);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);

    // ── Titre ───────────────────────────────────────────────────────────────
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('ani_diamond')} **Bump Disboard** ${e('ani_diamond')}`,
      ),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    // ── Statut ──────────────────────────────────────────────────────────────
    const statusLine = (nextBump && nextBump.next_bump_at > Date.now())
      ? `${e('btn_tip')} Prochain bump disponible <t:${Math.floor(nextBump.next_bump_at / 1000)}:R>`
      : `${e('btn_success')} **Tu peux bump maintenant !** Tape \`/bump\` dans ce salon.`;

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(statusLine),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    // ── Stats ───────────────────────────────────────────────────────────────
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('cat_information')} **Stats**\n` +
        `${e('ui_members')} Total serveur : **${totalBumps}** bumps\n` +
        `${e('ui_user')} Tes bumps : **${userBumps}**`,
      ),
    );

    if (lastBump) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ui_pin')} Dernier bump : <@${lastBump.user_id}> <t:${Math.floor(lastBump.bumped_at / 1000)}:R>`,
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    // ── Comment bump ────────────────────────────────────────────────────────
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_help')} **Comment bump ?**\n` +
        `1. Tape \`/bump\` (slash command)\n` +
        `2. Sélectionne le bot **Disboard**\n` +
        `3. Envoie — tu rapportes +1 bump à ton leaderboard !`,
      ),
    );

    // ── Avertissement config ────────────────────────────────────────────────
    if (!config || !config.enabled || !config.channel_id) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('btn_error')} Le système de rappel n'est pas configuré.\n` +
          `Un admin doit taper \`;bumpconfig\` pour activer les rappels automatiques.`,
        ),
      );
    }

    // ── Actions ─────────────────────────────────────────────────────────────
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('bump:stats')
          .setLabel('Stats complètes')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('bump:leaderboard')
          .setLabel('Leaderboard')
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
