'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_INSERT = db.prepare(
  'INSERT INTO polls (guild_id, channel_id, message_id, creator_id, question, options, active, ends_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
);

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = {
  name       : 'poll',
  aliases    : ['sondage', 'vote'],
  description: 'Crée un sondage avec boutons (2 à 5 options). Sépare avec `|`.',
  usage      : ';poll <question> | <option1> | <option2> [| ...]',
  cooldown   : 10,
  guildOnly  : true,

  async execute(message) {
    const raw = message.content.split(/\s+/).slice(1).join(' ');
    const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      return message.reply({ embeds: [E.error('Usage', '`;poll <question> | <option1> | <option2> [| ...]`\nMin 2 options, max 5.')] });
    }
    const [question, ...options] = parts;
    if (options.length > 5) {
      return message.reply({ embeds: [E.error('Trop d\'options', 'Maximum 5 options.')] });
    }

    const optionsJson = JSON.stringify(options.map((label, i) => ({ index: i, label, emoji: EMOJIS[i] })));

    const desc = options.map((o, i) => `${EMOJIS[i]} **${o}**`).join('\n');
    const embed = E.base()
      .setTitle(`📊 ${question}`)
      .setDescription(`${desc}\n\n_Vote en cliquant sur un bouton ci-dessous._`)
      .setFooter({ text: `Lancé par ${message.author.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      ...options.map((o, i) => new ButtonBuilder()
        .setCustomId(`pollv2:vote:${i}`)
        .setLabel(`${EMOJIS[i]} ${o.slice(0, 60)}`)
        .setStyle(ButtonStyle.Secondary)
      ),
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const endsAt = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);
    try {
      STMT_INSERT.run(message.guild.id, message.channel.id, msg.id, message.author.id, question, optionsJson, endsAt);
    } catch { /* ignore */ }

    return msg;
  },
};
