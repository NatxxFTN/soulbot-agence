'use strict';

const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_UPSERT = db.prepare(`
  INSERT INTO guild_xp (guild_id, user_id, xp, level, last_msg)
  VALUES (?, ?, ?, ?, unixepoch())
  ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = excluded.xp, level = excluded.level
`);

function levelFromXp(xp) {
  // Formule simple : level = floor(sqrt(xp / 100))
  return Math.max(0, Math.floor(Math.sqrt(xp / 100)));
}

module.exports = {
  name       : 'xpset',
  aliases    : ['setxp'],
  description: 'Définit l\'XP d\'un user (admin).',
  usage      : ';xpset <@user> <amount>',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre.')] });

    const amount = parseInt(args[args.length - 1], 10);
    if (Number.isNaN(amount) || amount < 0) {
      return message.reply({ embeds: [E.error('Montant invalide', 'Doit être un entier ≥ 0.')] });
    }

    const level = levelFromXp(amount);
    STMT_UPSERT.run(message.guild.id, target.id, amount, level);

    return message.reply({
      embeds: [E.success('XP mis à jour', `${target} → **${amount.toLocaleString('fr-FR')}** XP (Lvl **${level}**)`)],
    });
  },
};
