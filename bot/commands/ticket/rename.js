'use strict';

const E = require('../../utils/embeds');
const { getTicketByChannel, getConfig } = require('../../core/ticket-helper');

module.exports = {
  name       : 'rename',
  aliases    : ['trename', 'ticketrename'],
  description: 'Renommer le ticket courant.',
  usage      : ';rename <nouveau nom>',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    const ticket = getTicketByChannel(message.channel.id);
    if (!ticket) {
      return message.reply({ embeds: [E.error('Hors ticket', 'Cette commande s\'utilise dans un salon ticket.')] });
    }
    if (ticket.status !== 'open') {
      return message.reply({ embeds: [E.error('Ticket fermé', 'Impossible de renommer un ticket fermé.')] });
    }

    const config  = getConfig(message.guild.id);
    const isMod   = config?.staff_role_id ? message.member.roles.cache.has(config.staff_role_id) : false;
    const isOwner = message.author.id === ticket.user_id;

    if (!isMod && !isOwner) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Seul le créateur ou un staff peut renommer ce ticket.')] });
    }

    if (!args.length) {
      return message.reply({ embeds: [E.error('Nom manquant', 'Fournis le nouveau nom du ticket.')] });
    }

    const newName = args.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 100);
    if (!newName) {
      return message.reply({ embeds: [E.error('Nom invalide', 'Le nom ne peut contenir que des lettres, chiffres et tirets.')] });
    }

    const oldName = message.channel.name;
    try {
      await message.channel.setName(newName);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur', `Impossible de renommer : ${err.message}`)] });
    }

    return message.channel.send({
      embeds: [
        E.success('Ticket renommé')
          .addFields(
            { name: 'Ancien nom',  value: oldName,            inline: true },
            { name: 'Nouveau nom', value: newName,            inline: true },
            { name: 'Par',         value: message.author.tag, inline: true },
          ),
      ],
    });
  },
};
