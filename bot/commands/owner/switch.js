'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS cmd_perm_required (
    guild_id  TEXT NOT NULL,
    cmd_name  TEXT NOT NULL,
    perm_name TEXT NOT NULL,
    PRIMARY KEY (guild_id, cmd_name)
  );
`);

const STMT_GET    = db.prepare('SELECT perm_name FROM cmd_perm_required WHERE guild_id = ? AND cmd_name = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO cmd_perm_required (guild_id, cmd_name, perm_name) VALUES (?, ?, ?)
  ON CONFLICT(guild_id, cmd_name) DO UPDATE SET perm_name = excluded.perm_name
`);
const STMT_REMOVE = db.prepare('DELETE FROM cmd_perm_required WHERE guild_id = ? AND cmd_name = ?');

module.exports = {
  name       : 'switch',
  aliases    : [],
  description: 'Assigne (ou retire) un groupe de permissions requis pour une commande.',
  usage      : ';switch <permission> <commande>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const permName = args[0]?.toLowerCase();
      const cmdName  = args[1]?.toLowerCase();
      if (!permName || !cmdName) return message.reply({ embeds: [E.usage(';', 'switch <permission> <commande>')] });

      if (!client.commands.has(cmdName)) {
        return message.reply({ embeds: [E.error('Commande introuvable', `\`${cmdName}\` n'existe pas.`)] });
      }

      const existing = STMT_GET.get(message.guild.id, cmdName);

      // Toggle : si déjà ce perm, on retire ; sinon on assigne
      if (existing?.perm_name === permName) {
        STMT_REMOVE.run(message.guild.id, cmdName);
        return message.channel.send({
          embeds: [E.success('Permission retirée', `La commande \`${cmdName}\` n'a plus de groupe requis.`)],
        });
      }

      STMT_UPSERT.run(message.guild.id, cmdName, permName);
      return message.channel.send({
        embeds: [E.success('Permission assignée', `La commande \`${cmdName}\` requiert maintenant le groupe **${permName}**.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
