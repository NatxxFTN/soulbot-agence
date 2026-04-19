'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_REMOVE = db.prepare('DELETE FROM bot_whitelist WHERE user_id = ?');
const STMT_CHECK  = db.prepare('SELECT 1 FROM bot_whitelist WHERE user_id = ?');

module.exports = {
  name       : 'unwhitelist',
  aliases    : ['unwl'],
  description: 'Retire un utilisateur de la whitelist globale du bot.',
  usage      : ';unwhitelist <@membre/id>',
  cooldown   : 3,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const target = message.mentions.users.first();
      const userId = target?.id ?? args[0]?.replace(/\D/g, '');
      if (!userId) return message.reply({ embeds: [E.usage(';', 'unwhitelist <@membre/id>')] });

      if (!STMT_CHECK.get(userId)) {
        return message.reply({ embeds: [E.error('Non trouvé', `<@${userId}> n'est pas dans la whitelist.`)] });
      }

      STMT_REMOVE.run(userId);
      return message.channel.send({
        embeds: [E.success('Whitelist — Retrait', `<@${userId}> a été retiré de la whitelist.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
