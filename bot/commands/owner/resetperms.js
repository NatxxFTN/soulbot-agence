'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_COUNT  = db.prepare('SELECT COUNT(*) as n FROM guild_bot_perms WHERE guild_id = ?');
const STMT_DELETE = db.prepare('DELETE FROM guild_bot_perms WHERE guild_id = ?');

module.exports = {
  name       : 'resetperms',
  aliases    : [],
  description: 'Supprime toutes les permissions custom de ce serveur.',
  usage      : ';resetperms confirm',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const { n } = STMT_COUNT.get(message.guild.id);

      if (!n) {
        return message.channel.send({ embeds: [E.info('Permissions', 'Aucune permission custom sur ce serveur.')] });
      }

      if (args[0]?.toLowerCase() !== 'confirm') {
        return message.channel.send({
          embeds: [
            E.warning('Confirmation requise', `**${n}** permission(s) seront supprimées.\nRelance avec \`;resetperms confirm\` pour confirmer.`),
          ],
        });
      }

      STMT_DELETE.run(message.guild.id);
      return message.channel.send({
        embeds: [E.success('Permissions réinitialisées', `**${n}** permission(s) supprimée(s).`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
