'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getTicketByChannel } = require('../../core/ticket-helper');
const { db } = require('../../database');

const STMT_ADD = db.prepare(
  'INSERT OR IGNORE INTO ticket_participants (ticket_id, user_id, added_by) VALUES (?, ?, ?)'
);

module.exports = {
  name       : 'add',
  aliases    : ['tadd', 'adduser'],
  description: 'Ajouter un membre au ticket courant.',
  usage      : ';add @membre',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    const ticket = getTicketByChannel(message.channel.id);
    if (!ticket) {
      return message.reply({ embeds: [E.error('Hors ticket', 'Cette commande s\'utilise dans un salon ticket.')] });
    }
    if (ticket.status !== 'open') {
      return message.reply({ embeds: [E.error('Ticket fermé', 'Impossible d\'ajouter un membre à un ticket fermé.')] });
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre à ajouter.')] });
    if (target.user.bot) return message.reply({ embeds: [E.error('Action impossible', 'Impossible d\'ajouter un bot.')] });

    try {
      await message.channel.permissionOverwrites.edit(target, {
        ViewChannel     : true,
        SendMessages    : true,
        ReadMessageHistory: true,
      });
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur', `Impossible de modifier les permissions : ${err.message}`)] });
    }

    STMT_ADD.run(ticket.id, target.id, message.author.id);

    return message.channel.send({
      embeds: [
        E.success('Membre ajouté')
          .addFields(
            { name: 'Membre',     value: target.toString(),    inline: true },
            { name: 'Ajouté par', value: message.author.tag,  inline: true },
          ),
      ],
    });
  },
};
