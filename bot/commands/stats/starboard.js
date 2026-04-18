'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db, getGuildSettings } = require('../../database');
const { formatNumber }         = require('../../utils/format');
const E = require('../../utils/embeds');

/*
 * ;starboard              — Affiche les messages les plus étoilés
 * ;starboard top [n]      — Top N messages (défaut 10)
 * ;starboard search       — (futur)
 */
module.exports = {
  name        : 'starboard',
  aliases     : ['sb', 'stars'],
  description : 'Affiche les messages les plus étoilés du starboard.',
  usage       : 'starboard [top <n>]',
  cooldown    : 5,

  async execute(message, args, client) {
    const guildId  = message.guild.id;
    const settings = getGuildSettings(guildId);

    if (!settings.star_enabled && !settings.star_channel_id) {
      return message.reply({ embeds: [E.info('Starboard', 'Le starboard n\'est pas configuré. Utilise `;star channel #salon` pour le paramétrer.')] });
    }

    const sub   = (args[0] ?? 'top').toLowerCase();
    const limit = Math.min(parseInt(args[1] ?? args[0]) || 10, 25);

    // ── ;starboard top ────────────────────────────────────────────────────────
    const entries = db.prepare(`
      SELECT * FROM starboard_entries
      WHERE guild_id = ? AND starboard_message_id IS NOT NULL
      ORDER BY star_count DESC LIMIT ?
    `).all(guildId, limit);

    if (!entries.length) {
      return message.reply({ embeds: [E.info('Starboard', 'Aucun message n\'a encore rejoint le starboard.')] });
    }

    // ── Pagination par boutons ────────────────────────────────────────────────
    let page = 0;
    const perPage = 5;
    const maxPage = Math.ceil(entries.length / perPage) - 1;

    const buildEmbed = async (p) => {
      const slice = entries.slice(p * perPage, (p + 1) * perPage);
      const lines = await Promise.all(slice.map(async (entry, i) => {
        const globalIdx = p * perPage + i + 1;
        const user = await client.users.fetch(entry.author_id).catch(() => null);
        const name = user ? user.username : 'Inconnu';
        const chan = message.guild.channels.cache.get(entry.original_channel_id);
        const chanName = chan ? `#${chan.name}` : 'salon supprimé';
        const link = entry.starboard_message_id
          ? `[Voir](https://discord.com/channels/${guildId}/${settings.star_channel_id}/${entry.starboard_message_id})`
          : '';
        return `\`${String(globalIdx).padStart(2,' ')}.\` ${settings.star_emoji} **${entry.star_count}** — **${name}** dans ${chanName} ${link}`;
      }));

      return new EmbedBuilder()
        .setColor(E.COLORS.GOLD)
        .setTitle(`⭐  Starboard — Top ${entries.length}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Page ${p + 1}/${maxPage + 1} • ${message.guild.name}` })
        .setTimestamp();
    };

    if (maxPage === 0) {
      return message.reply({ embeds: [await buildEmbed(0)] });
    }

    // Plusieurs pages → boutons
    const row = (p) => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
      new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(p >= maxPage),
    );

    const reply = await message.reply({ embeds: [await buildEmbed(0)], components: [row(0)] });

    const collector = reply.createMessageComponentCollector({
      componentType : ComponentType.Button,
      filter        : i => i.user.id === message.author.id,
      time          : 60_000,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'prev' && page > 0) page--;
      else if (interaction.customId === 'next' && page < maxPage) page++;
      await interaction.update({ embeds: [await buildEmbed(page)], components: [row(page)] });
    });

    collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
  },
};
