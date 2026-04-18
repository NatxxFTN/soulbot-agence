'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'clear',
  aliases    : ['purge'],
  description: 'Supprimer des messages en masse (1–100).',
  usage      : ';clear [nombre]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageMessages'],

  async execute(message, args) {
    const amount = parseInt(args[0], 10) || 10;
    if (amount < 1 || amount > 100) {
      return message.reply({ embeds: [E.error('Valeur invalide', 'Entre un nombre entre **1** et **100**.')] });
    }

    await message.channel.bulkDelete(amount + 1, true).catch(() => {});

    STMT.run(message.guild.id, 'CLEAR', message.author.id, message.author.tag, `${amount} messages dans #${message.channel.name}`);

    const confirm = await message.channel.send({ embeds: [E.success('Messages supprimés', `**${amount}** message(s) effacé(s).`)] });
    setTimeout(() => confirm.delete().catch(() => {}), 3000);
  },
};
