'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_disabled_cmds (
    guild_id TEXT NOT NULL,
    cmd_name TEXT NOT NULL,
    PRIMARY KEY (guild_id, cmd_name)
  );
`);

const STMT_DISABLE = db.prepare('INSERT OR IGNORE INTO guild_disabled_cmds (guild_id, cmd_name) VALUES (?, ?)');
const STMT_ENABLE  = db.prepare('DELETE FROM guild_disabled_cmds WHERE guild_id = ? AND cmd_name = ?');
const STMT_LIST    = db.prepare('SELECT cmd_name FROM guild_disabled_cmds WHERE guild_id = ? ORDER BY cmd_name');
const STMT_CHECK   = db.prepare('SELECT 1 FROM guild_disabled_cmds WHERE guild_id = ? AND cmd_name = ?');

const PROTECTED = new Set(['disable', 'help', 'ping']);

module.exports = {
  name       : 'disable',
  aliases    : [],
  description: 'Désactive ou réactive une commande sur ce serveur.',
  usage      : ';disable <commande|list> | ;disable enable <commande>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        const rows = STMT_LIST.all(message.guild.id);
        if (!rows.length) {
          return message.channel.send({ embeds: [E.info('Commandes désactivées', 'Aucune commande n\'est désactivée sur ce serveur.')] });
        }
        return message.channel.send({
          embeds: [E.base()
            .setTitle(`Commandes désactivées (${rows.length})`)
            .setDescription(rows.map(r => `\`${r.cmd_name}\``).join(', '))],
        });
      }

      if (sub === 'enable') {
        const cmdName = args[1]?.toLowerCase();
        if (!cmdName) return message.reply({ embeds: [E.usage(';', 'disable enable <commande>')] });
        STMT_ENABLE.run(message.guild.id, cmdName);
        return message.channel.send({ embeds: [E.success('Commande réactivée', `\`${cmdName}\` est à nouveau disponible.`)] });
      }

      if (!sub) return message.reply({ embeds: [E.usage(';', 'disable <commande|list> | disable enable <commande>')] });

      if (PROTECTED.has(sub)) {
        return message.reply({ embeds: [E.error('Protégée', `La commande \`${sub}\` ne peut pas être désactivée.`)] });
      }

      if (!client.commands.has(sub)) {
        return message.reply({ embeds: [E.error('Introuvable', `La commande \`${sub}\` n'existe pas.`)] });
      }

      if (STMT_CHECK.get(message.guild.id, sub)) {
        return message.reply({ embeds: [E.warning('Déjà désactivée', `\`${sub}\` est déjà désactivée. Utilise \`;disable enable ${sub}\` pour la réactiver.`)] });
      }

      STMT_DISABLE.run(message.guild.id, sub);
      return message.channel.send({ embeds: [E.success('Commande désactivée', `\`${sub}\` ne répondra plus sur ce serveur.`)] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
