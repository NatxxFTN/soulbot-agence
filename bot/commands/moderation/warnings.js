'use strict';

const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_GET = db.prepare(
  'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10'
);

module.exports = {
  name       : 'warnings',
  aliases    : ['warns'],
  description: 'Consulter les avertissements d\'un membre.',
  usage      : ';warnings [@membre]',
  cooldown   : 5,
  guildOnly  : true,

  async execute(message) {
    const target = message.mentions.members.first() ?? message.member;

    let rows;
    try {
      rows = STMT_GET.all(message.guild.id, target.id);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur DB', 'Impossible de récupérer les avertissements.')] });
    }

    const description = rows.length === 0
      ? '*Aucun avertissement enregistré.*'
      : rows.map((w, i) => `**${i + 1}.** ${w.reason} — *par ${w.moderator_tag}* — <t:${w.created_at}:R>`).join('\n');

    return message.channel.send({
      embeds: [
        E.base()
          .setTitle(`Avertissements — ${target.user.tag}`)
          .setThumbnail(target.user.displayAvatarURL())
          .setDescription(description)
          .setFooter({ text: `Total : ${rows.length} avertissement(s)` }),
      ],
    });
  },
};
