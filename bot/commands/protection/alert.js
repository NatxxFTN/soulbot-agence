'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'alert',
  aliases    : ['alerte', 'sos'],
  description: 'Envoie une alerte d\'urgence en DM aux owners du bot.',
  usage      : ';alert [message]',
  cooldown   : 10,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const alertMsg = args.join(' ').trim() || '*(Aucun message fourni)*';
    const ownerIds = (process.env.BOT_OWNERS ?? '')
      .split(',').map(s => s.trim()).filter(s => /^\d{17,19}$/.test(s));

    if (ownerIds.length === 0) {
      return message.reply({ embeds: [E.error('Erreur config', 'Aucun owner configuré dans `.env` (BOT_OWNERS).')] });
    }

    let sent = 0;
    for (const ownerId of ownerIds) {
      try {
        const owner = await message.client.users.fetch(ownerId);
        await owner.send(
          `🚨 **ALERTE URGENCE** — \`${message.guild.name}\` (${message.guild.id})\n` +
          `Par : <@${message.author.id}> (\`${message.author.tag}\`)\n` +
          `Salon : <#${message.channel.id}>\n\n` +
          `**Message :** ${alertMsg}`
        );
        sent++;
      } catch { /* DM fermés ou user introuvable */ }
    }

    return message.reply({
      embeds: [
        sent > 0
          ? E.success('Alerte envoyée', `Alerte transmise à **${sent}** owner(s) en DM.`)
          : E.error('Échec', 'Impossible d\'envoyer le DM aux owners (DMs peut-être fermés).'),
      ],
    });
  },
};
