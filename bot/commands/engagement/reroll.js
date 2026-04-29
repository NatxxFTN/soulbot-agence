'use strict';

// Note : ;reroll existe déjà. Cette version est wrapper sécurisé.
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_GET = db.prepare('SELECT * FROM giveaways WHERE message_id = ?');
const STMT_PARTS = db.prepare('SELECT user_id FROM giveaway_participants WHERE giveaway_id = ?');

module.exports = {
  name       : 'gwreroll',
  aliases    : ['gwrr'],
  description: 'Re-tire un gagnant pour un giveaway terminé (Pack Engagement).',
  usage      : ';gwreroll <message_id>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message, args) {
    const msgId = args[0];
    if (!msgId) return message.reply({ embeds: [E.error('Usage', '`;gwreroll <message_id>`')] });

    const gw = STMT_GET.get(msgId);
    if (!gw) return message.reply({ embeds: [E.error('Introuvable', 'Aucun giveaway pour ce message.')] });

    const parts = STMT_PARTS.all(gw.id).map(p => p.user_id);
    if (!parts.length) return message.reply({ embeds: [E.warning('Aucun participant', 'Personne n\'avait participé.')] });

    const previous = gw.winner_ids ? gw.winner_ids.split(',') : [];
    const eligible = parts.filter(id => !previous.includes(id));
    const pool = eligible.length ? eligible : parts;

    const winner = pool[Math.floor(Math.random() * pool.length)];

    return message.channel.send({
      embeds: [E.success('🎉 Reroll giveaway')
        .setDescription(`**Gain :** ${gw.prize}\n**Nouveau gagnant :** <@${winner}>\n_(parmi ${pool.length} participant(s) éligible(s))_`)],
    });
  },
};
