'use strict';

const { EmbedBuilder } = require('discord.js');
const { db }           = require('../../database');
const { formatBirthday } = require('../../utils/format');
const E = require('../../utils/embeds');

/*
 * ;list bday [mois]
 * Affiche tous les anniversaires enregistrés, triés par mois/jour.
 * Optionnel : filtrer par numéro de mois (1-12).
 */
module.exports = {
  name        : 'list',
  aliases     : [],
  description : 'Liste les anniversaires enregistrés.',
  usage       : 'list bday [mois 1-12]',
  cooldown    : 5,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const sub     = (args[0] ?? '').toLowerCase();

    // Ce fichier ne gère que le sous-argument "bday"
    if (sub !== 'bday' && sub !== 'birthday' && sub !== 'anniversaire') {
      return; // laisser d'autres commandes "list" gérer leurs sous-commandes
    }

    const monthFilter = parseInt(args[1]);
    const hasFilter   = !isNaN(monthFilter) && monthFilter >= 1 && monthFilter <= 12;

    let rows;
    if (hasFilter) {
      rows = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? AND month = ? ORDER BY day ASC').all(guildId, monthFilter);
    } else {
      rows = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? ORDER BY month ASC, day ASC').all(guildId);
    }

    if (!rows.length) {
      return message.reply({ embeds: [E.info('Anniversaires', hasFilter ? `Aucun anniversaire enregistré pour ce mois.` : 'Aucun anniversaire enregistré sur ce serveur.\nUtilise `;bday set JJ/MM` pour enregistrer le tien !')] });
    }

    // Identifier les anniversaires du mois en cours / à venir
    const today = new Date();
    const todayDay   = today.getDate();
    const todayMonth = today.getMonth() + 1;

    const PAGE_SIZE = 20;
    const pageArg   = parseInt(args.find(a => /^\d+$/.test(a)) ?? '1');
    const page      = Math.max(0, (isNaN(pageArg) ? 1 : pageArg) - 1);
    const total     = rows.length;
    const slice     = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const lines = await Promise.all(slice.map(async row => {
      const user = await client.users.fetch(row.user_id).catch(() => null);
      const name = user ? `**${user.username}**` : `<@${row.user_id}>`;
      const date = formatBirthday(row.day, row.month);
      const isBday = row.day === todayDay && row.month === todayMonth;
      return `${isBday ? '🎂' : '📅'}  ${name} — ${date}${row.year ? ` ${today.getFullYear() - row.year} ans` : ''}`;
    }));

    const monthNames = ['', 'Janvier','Février','Mars','Avril','Mai','Juin',
                        'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    const embed = new EmbedBuilder()
      .setColor(E.COLORS.PRIMARY)
      .setTitle(`🎂  Anniversaires${hasFilter ? ` — ${monthNames[monthFilter]}` : ''}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${total} anniversaire(s) enregistré(s) • Page ${page + 1}/${Math.ceil(total / PAGE_SIZE)}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
