'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LIST   = db.prepare('SELECT * FROM guild_bot_perms WHERE guild_id = ?');
const STMT_UPDATE = db.prepare('UPDATE guild_bot_perms SET commands = ? WHERE guild_id = ? AND target_id = ?');

module.exports = {
  name       : 'renewperms',
  aliases    : [],
  description: 'Synchronise les permissions custom en retirant les commandes supprimées.',
  usage      : ';renewperms',
  cooldown   : 10,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const rows    = STMT_LIST.all(message.guild.id);
      if (!rows.length) {
        return message.channel.send({ embeds: [E.info('Permissions', 'Aucune permission custom à synchroniser.')] });
      }

      let cleaned = 0;
      for (const row of rows) {
        const cmds    = JSON.parse(row.commands);
        const valid   = cmds.filter(c => client.commands.has(c));
        if (valid.length !== cmds.length) {
          STMT_UPDATE.run(JSON.stringify(valid), message.guild.id, row.target_id);
          cleaned += cmds.length - valid.length;
        }
      }

      return message.channel.send({
        embeds: [E.success('Permissions synchronisées', cleaned > 0
          ? `**${cleaned}** entrée(s) obsolète(s) supprimée(s).`
          : 'Toutes les permissions sont déjà à jour.')],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
