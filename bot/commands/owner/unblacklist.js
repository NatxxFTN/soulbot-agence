'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_REMOVE = db.prepare('DELETE FROM bot_blacklist WHERE user_id = ?');
const STMT_CLEAR  = db.prepare('DELETE FROM bot_blacklist');
const STMT_GET    = db.prepare('SELECT 1 FROM bot_blacklist WHERE user_id = ?');

module.exports = {
  name       : 'unblacklist',
  aliases    : ['unbl'],
  description: 'Retire un utilisateur (ou tous) de la blacklist globale du bot.',
  usage      : ';unblacklist <@membre/id/all>',
  cooldown   : 3,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const input = args[0]?.toLowerCase();
      if (!input) return message.reply({ embeds: [E.usage(';', 'unblacklist <@membre/id/all>')] });

      if (input === 'all') {
        const result = STMT_CLEAR.run();
        return message.channel.send({
          embeds: [E.success('Blacklist vidée', `${result.changes} utilisateur(s) retiré(s) de la blacklist.`)],
        });
      }

      const target = message.mentions.users.first();
      const userId = target?.id ?? input.replace(/\D/g, '');
      if (!userId) return message.reply({ embeds: [E.usage(';', 'unblacklist <@membre/id/all>')] });

      if (!STMT_GET.get(userId)) {
        return message.reply({ embeds: [E.error('Non trouvé', `Cet utilisateur n'est pas dans la blacklist.`)] });
      }

      STMT_REMOVE.run(userId);
      return message.channel.send({
        embeds: [E.success('Blacklist — Retrait', `<@${userId}> a été retiré de la blacklist.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
