'use strict';

const E = require('../../utils/embeds');
const { getTicketByChannel } = require('../../core/ticket-helper');
const { db } = require('../../database');

const STMT_DEL = db.prepare('DELETE FROM ticket_participants WHERE ticket_id = ? AND user_id = ?');

module.exports = {
  name       : 'remove',
  aliases    : ['tremove', 'rmuser'],
  description: 'Retirer un membre du ticket courant.',
  usage      : ';remove @membre',
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
      return message.reply({ embeds: [E.error('Ticket fermé', 'Impossible de retirer un membre d\'un ticket fermé.')] });
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre à retirer.')] });

    if (target.id === ticket.user_id) {
      return message.reply({ embeds: [E.error('Action impossible', 'Impossible de retirer le créateur du ticket.')] });
    }

    try {
      await message.channel.permissionOverwrites.delete(target);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur', `Impossible de modifier les permissions : ${err.message}`)] });
    }

    STMT_DEL.run(ticket.id, target.id);

    return message.channel.send({
      embeds: [
        E.success('Membre retiré')
          .addFields(
            { name: 'Membre',    value: target.toString(),   inline: true },
            { name: 'Retiré par', value: message.author.tag, inline: true },
          ),
      ],
    });
  },
};
