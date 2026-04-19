'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_REMOVE = db.prepare('DELETE FROM bot_managers WHERE user_id = ?');
const STMT_CHECK  = db.prepare('SELECT 1 FROM bot_managers WHERE user_id = ?');

module.exports = {
  name       : 'unmanager',
  aliases    : [],
  description: 'Retire le statut de manager du bot à un utilisateur.',
  usage      : ';unmanager <@membre/id>',
  cooldown   : 3,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const target = message.mentions.users.first();
      const userId = target?.id ?? args[0]?.replace(/\D/g, '');
      if (!userId) return message.reply({ embeds: [E.usage(';', 'unmanager <@membre/id>')] });

      if (!STMT_CHECK.get(userId)) {
        return message.reply({ embeds: [E.error('Non trouvé', `Cet utilisateur n'est pas manager.`)] });
      }

      STMT_REMOVE.run(userId);
      return message.channel.send({
        embeds: [E.success('Manager retiré', `<@${userId}> n'est plus manager du bot.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
