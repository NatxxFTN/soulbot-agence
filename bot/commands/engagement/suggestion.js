'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_INS = db.prepare(
  'INSERT INTO suggestionv2 (guild_id, channel_id, message_id, author_id, text) VALUES (?, ?, ?, ?, ?)'
);

const SUGGESTION_CHANNEL_NAMES = ['suggestions', '💡-suggestions', 'suggestion'];

module.exports = {
  name       : 'sugg',
  aliases    : ['suggestv2', 'feedback'],
  description: 'Crée une suggestion avec votes 👍/👎 (Pack Engagement).',
  usage      : ';sugg <texte>',
  cooldown   : 10,
  guildOnly  : true,

  async execute(message) {
    const text = message.content.split(/\s+/).slice(1).join(' ').trim();
    if (!text) return message.reply({ embeds: [E.error('Usage', '`;sugg <ta suggestion>`')] });

    const guild = message.guild;
    let channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && SUGGESTION_CHANNEL_NAMES.includes(c.name));
    if (!channel) {
      try {
        channel = await guild.channels.create({
          name: 'suggestions',
          type: ChannelType.GuildText,
          reason: '[engagement/sugg] auto-création',
        });
      } catch { /* ignore */ }
    }
    if (!channel) channel = message.channel;

    const embed = E.base()
      .setTitle('💡 Nouvelle suggestion')
      .setDescription(text.slice(0, 2000))
      .setFooter({ text: `Par ${message.author.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('suggv2:up').setLabel('👍 Pour (0)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('suggv2:down').setLabel('👎 Contre (0)').setStyle(ButtonStyle.Danger),
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });
    try { STMT_INS.run(guild.id, channel.id, msg.id, message.author.id, text); } catch { /* ignore */ }

    if (channel.id !== message.channel.id) {
      return message.reply({ embeds: [E.success('Suggestion postée', `Postée dans ${channel}.`)] });
    }
  },
};
