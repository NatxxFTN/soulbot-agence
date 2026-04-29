'use strict';

// Note : la commande ;giveaway existante (bot/commands/giveaway/giveaway.js) charge
// après cette catégorie et écrasera ce fichier au load. Cette version est conservée
// pour le pack Engagement mais le runtime utilisera la version giveaway/.

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

let parseDuration;
try { parseDuration = require('ms'); } catch { parseDuration = () => null; }

const STMT_INSERT = db.prepare(
  'INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winners_count, ends_at, created_by) VALUES (?, ?, ?, ?, 1, ?, ?)'
);

module.exports = {
  name       : 'gwcreate',
  aliases    : ['gw', 'gwstart'],
  description: 'Lance un giveaway avec bouton 🎉 (Pack Engagement).',
  usage      : ';gwcreate <durée> <prix>',
  cooldown   : 10,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message, args) {
    if (args.length < 2) {
      return message.reply({ embeds: [E.error('Usage', '`;gwcreate <durée: 10m, 1h, 1d> <prix>`')] });
    }
    const dur = args[0];
    const prize = args.slice(1).join(' ').slice(0, 256);
    const ms = parseDuration(dur);
    if (!ms || ms < 60_000) {
      return message.reply({ embeds: [E.error('Durée invalide', 'Min 1m, format `10m / 1h / 1d`.')] });
    }

    const endsAt = Math.floor((Date.now() + ms) / 1000);
    const embed = E.base()
      .setTitle(`🎉 Giveaway — ${prize}`)
      .setDescription(`Clique sur **🎉 Participer** pour entrer.\n\nFin : <t:${endsAt}:R>`)
      .setFooter({ text: `Lancé par ${message.author.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gwv2:join`)
        .setLabel('🎉 Participer')
        .setStyle(ButtonStyle.Success),
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });
    try {
      STMT_INSERT.run(message.guild.id, message.channel.id, msg.id, prize, endsAt, message.author.id);
    } catch { /* ignore */ }

    return msg;
  },
};
