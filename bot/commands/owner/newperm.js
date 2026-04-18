'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_GET    = db.prepare('SELECT * FROM guild_bot_perms WHERE guild_id = ? AND target_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO guild_bot_perms (guild_id, target_id, target_type, commands)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(guild_id, target_id) DO UPDATE SET commands = excluded.commands
`);

module.exports = {
  name       : 'newperm',
  aliases    : [],
  description: 'Ajoute une permission de commande custom à un rôle ou utilisateur.',
  usage      : ';newperm <@role|@user> <commande>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const target = message.mentions.roles.first() || message.mentions.users.first();
      if (!target) return message.reply({ embeds: [E.usage(';', 'newperm <@role|@user> <commande>')] });

      const cmdName = args[1]?.toLowerCase();
      if (!cmdName) return message.reply({ embeds: [E.usage(';', 'newperm <@role|@user> <commande>')] });
      if (!client.commands.has(cmdName)) {
        return message.reply({ embeds: [E.error('Commande introuvable', `\`${cmdName}\` n'existe pas.`)] });
      }

      const targetId   = target.id;
      const targetType = message.mentions.roles.first() ? 'role' : 'user';
      const row        = STMT_GET.get(message.guild.id, targetId);
      const cmds       = row ? JSON.parse(row.commands) : [];

      if (cmds.includes(cmdName)) {
        return message.reply({ embeds: [E.warning('Déjà accordée', `\`${cmdName}\` est déjà dans les permissions de cette cible.`)] });
      }

      cmds.push(cmdName);
      STMT_UPSERT.run(message.guild.id, targetId, targetType, JSON.stringify(cmds));

      const mention = targetType === 'role' ? `<@&${targetId}>` : `<@${targetId}>`;
      return message.channel.send({
        embeds: [E.success('Permission ajoutée', `Commande \`${cmdName}\` accordée à ${mention}.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
