'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_bot_perms (
    guild_id   TEXT NOT NULL,
    target_id  TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('role', 'user')),
    commands   TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY (guild_id, target_id)
  );
`);

const STMT_GET    = db.prepare('SELECT * FROM guild_bot_perms WHERE guild_id = ? AND target_id = ?');
const STMT_REMOVE = db.prepare('DELETE FROM guild_bot_perms WHERE guild_id = ? AND target_id = ?');
const STMT_UPDATE = db.prepare('UPDATE guild_bot_perms SET commands = ? WHERE guild_id = ? AND target_id = ?');

module.exports = {
  name       : 'delperm',
  aliases    : [],
  description: 'Supprime les permissions de commande custom d\'un rôle ou utilisateur.',
  usage      : ';delperm <@role|@user> [commande]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const target = message.mentions.roles.first() || message.mentions.users.first();
      if (!target) {
        return message.reply({ embeds: [E.usage(';', 'delperm <@role|@user> [commande]')] });
      }

      const targetId   = target.id;
      const targetType = message.mentions.roles.first() ? 'role' : 'user';
      const cmdName    = args[1]?.toLowerCase();
      const row        = STMT_GET.get(message.guild.id, targetId);

      if (!row) {
        return message.reply({ embeds: [E.error('Aucune permission', 'Ce rôle/utilisateur n\'a aucune permission custom.')] });
      }

      if (!cmdName) {
        STMT_REMOVE.run(message.guild.id, targetId);
        return message.channel.send({
          embeds: [E.success('Permissions supprimées', `Toutes les permissions custom de <@${targetType === 'role' ? '&' : ''}${targetId}> ont été supprimées.`)],
        });
      }

      let cmds = JSON.parse(row.commands);
      if (!cmds.includes(cmdName)) {
        return message.reply({ embeds: [E.error('Non trouvé', `La commande \`${cmdName}\` n'est pas dans les permissions de cette cible.`)] });
      }

      cmds = cmds.filter(c => c !== cmdName);
      if (!cmds.length) {
        STMT_REMOVE.run(message.guild.id, targetId);
      } else {
        STMT_UPDATE.run(JSON.stringify(cmds), message.guild.id, targetId);
      }

      return message.channel.send({
        embeds: [E.success('Permission retirée', `Commande \`${cmdName}\` retirée des permissions de <@${targetType === 'role' ? '&' : ''}${targetId}>.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
