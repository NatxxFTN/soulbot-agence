'use strict';

const { EmbedBuilder }      = require('discord.js');
const { db }                = require('../../database');
const { parseDays, formatDate } = require('../../utils/format');
const E = require('../../utils/embeds');

/*
 * ;inactif [jours] [--export]
 * Liste les membres n'ayant pas écrit depuis N jours (défaut : 30).
 */
module.exports = {
  name        : 'inactif',
  aliases     : ['inactive', 'inactifs'],
  description : 'Liste les membres inactifs depuis N jours.',
  usage       : 'inactif [jours] [--roles @role1 @role2]',
  cooldown    : 10,
  guildOnly  : true,
  permissions : ['ManageGuild'],

  async execute(message, args, client) {
    const guildId = message.guild.id;

    // Parsing des arguments
    const days      = parseDays(args[0]) ?? 30;
    const threshold = Math.floor(Date.now() / 1000) - days * 86400;

    // Récupération des membres ayant eu une activité mais plus récente que le seuil
    // ET les membres jamais enregistrés (last_message_at IS NULL)
    const knownInactive = db.prepare(`
      SELECT user_id, messages, last_message_at
      FROM user_stats
      WHERE guild_id = ? AND (last_message_at < ? OR last_message_at IS NULL)
      ORDER BY last_message_at ASC NULLS FIRST
    `).all(guildId, threshold);

    // On fetch les membres de la guilde pour filtrer les bots / non-présents
    let members;
    try {
      members = await message.guild.members.fetch();
    } catch {
      return message.reply({ embeds: [E.error('Erreur', 'Impossible de récupérer la liste des membres.')] });
    }

    const inactiveList = [];

    // Membres ayant des stats mais inactifs
    for (const row of knownInactive) {
      const member = members.get(row.user_id);
      if (!member || member.user.bot) continue;
      inactiveList.push({
        member,
        messages      : row.messages,
        last_message_at : row.last_message_at,
      });
    }

    // Membres sans aucune stat (jamais écrit)
    const knownIds = new Set(db.prepare('SELECT user_id FROM user_stats WHERE guild_id = ?').all(guildId).map(r => r.user_id));
    for (const [id, member] of members) {
      if (member.user.bot) continue;
      if (!knownIds.has(id)) {
        inactiveList.push({ member, messages: 0, last_message_at: null });
      }
    }

    if (!inactiveList.length) {
      return message.reply({ embeds: [E.success('Résultat', `Aucun membre inactif depuis **${days} jours** ! 🎉`)] });
    }

    // Pagination (max 20 par embed)
    const PAGE_SIZE = 20;
    const page      = Math.max(0, (parseInt(args.find(a => a.startsWith('--page='))?.split('=')[1]) || 1) - 1);
    const total     = inactiveList.length;
    const slice     = inactiveList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const lines = slice.map((item, i) => {
      const idx  = page * PAGE_SIZE + i + 1;
      const when = item.last_message_at ? `<t:${item.last_message_at}:R>` : '*jamais*';
      return `\`${String(idx).padStart(3, ' ')}.\` ${item.member} — dernier msg : ${when} (${item.messages} msgs)`;
    });

    const embed = new EmbedBuilder()
      .setColor(E.COLORS.WARNING)
      .setTitle(`⚠️  Membres inactifs depuis ${days}j`)
      .setDescription(lines.join('\n'))
      .addFields({ name: '📊 Total', value: `**${total}** membre(s) inactif(s)`, inline: true })
      .setFooter({ text: `Page ${page + 1}/${Math.ceil(total / PAGE_SIZE)} • ${message.guild.name}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
