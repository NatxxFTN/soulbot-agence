'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'unban',
  aliases    : [],
  description: 'Lever le ban d\'un utilisateur par son ID.',
  usage      : ';unban <userID> [raison]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['BanMembers'],

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [E.error('ID manquant', 'Fournis l\'ID Discord de l\'utilisateur à débannir.')] });

    if (!/^\d{17,19}$/.test(args[0])) {
      return message.reply({ embeds: [E.error('ID invalide', 'L\'ID Discord doit contenir 17 à 19 chiffres.')] });
    }

    try {
      await message.guild.bans.remove(args[0]);
      STMT.run(message.guild.id, 'UNBAN', args[0], args[0], message.author.id, message.author.tag, 'Unban');

      return message.reply({
        embeds: [E.success('Unban effectué', `Utilisateur \`${args[0]}\` débanni avec succès.`)],
      });
    } catch {
      return message.reply({ embeds: [E.error('Utilisateur introuvable', 'Cet ID n\'est pas dans la liste des bans.')] });
    }
  },
};
