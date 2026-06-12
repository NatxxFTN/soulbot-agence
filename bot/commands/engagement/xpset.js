'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
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

function panel(title, body) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  return container;
}

function replyPanel(message, title, body) {
  return message.reply({
    components: [panel(title, body)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
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
    if (!target) return replyPanel(message, `${e('btn_error')} **Cible manquante**`, 'Mentionne un membre.');

    const amount = parseInt(args[args.length - 1], 10);
    if (Number.isNaN(amount) || amount < 0) {
      return replyPanel(message, `${e('btn_error')} **Montant invalide**`, 'Doit être un entier ≥ 0.');
    }

    const level = levelFromXp(amount);
    STMT_UPSERT.run(message.guild.id, target.id, amount, level);

    return replyPanel(message, `${e('btn_success')} **XP mis à jour**`, `${target} possède désormais **${amount.toLocaleString('fr-FR')}** XP (Lvl **${level}**)`);
  },
};
