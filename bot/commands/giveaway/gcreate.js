'use strict';

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const E = require('../../utils/embeds');
const { parseDuration, formatDuration, createGiveaway } = require('../../core/giveaway-helper');
const { e } = require('../../core/emojis');

module.exports = {
  name       : 'gcreate',
  aliases    : ['gc', 'gstart'],
  description: 'Créer un giveaway dans un salon.',
  usage      : ';gcreate #salon <durée> <gain>  — ex: ;gcreate #général 1h PS5',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) &&
        !message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les événements** ou Admin.')] });
    }

    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply({ embeds: [E.error('Salon manquant', 'Usage : `;gcreate #salon <durée> <gain>`\nExemple : `;gcreate #général 1h PS5`')] });
    }

    const durationStr = args[1];
    const duration    = parseDuration(durationStr);
    if (!duration) {
      return message.reply({ embeds: [E.error('Durée invalide', 'Formats acceptés : `30s` · `15m` · `2h` · `7d`')] });
    }
    if (duration > 30 * 86_400_000) {
      return message.reply({ embeds: [E.error('Durée excessive', 'La durée maximum est de **30 jours**.')] });
    }

    const prize = args.slice(2).join(' ').trim();
    if (!prize) {
      return message.reply({ embeds: [E.error('Gain manquant', 'Précise ce que les participants peuvent gagner.')] });
    }

    const endsAt = Date.now() + duration;

    let gwMessage;
    try {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`${e('cat_giveaway')} GIVEAWAY`)
        .setDescription(
          `**Gain :** ${prize}\n` +
          `**Se termine :** <t:${Math.floor(endsAt / 1000)}:R>\n` +
          `**Gagnants :** 1\n\n` +
          `Réagis avec 🎉 pour participer !`
        )
        .setFooter({ text: `Organisé par ${message.author.tag}` })
        .setTimestamp(endsAt);

      gwMessage = await channel.send({ embeds: [embed] });
      await gwMessage.react('🎉');
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur', `Impossible de poster dans ${channel} : ${err.message}`)] });
    }

    const id = createGiveaway({
      guildId     : message.guild.id,
      channelId   : channel.id,
      messageId   : gwMessage.id,
      prize,
      winnersCount: 1,
      endsAt,
      createdBy   : message.author.id,
    });

    return message.reply({
      embeds: [
        E.success('Giveaway créé')
          .addFields(
            { name: 'ID',     value: `\`${id}\``,              inline: true },
            { name: 'Salon',  value: channel.toString(),        inline: true },
            { name: 'Durée',  value: formatDuration(duration),  inline: true },
            { name: 'Gain',   value: prize },
          ),
      ],
    });
  },
};
