'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LIST   = db.prepare('SELECT cmd_name FROM cmd_perm_required WHERE guild_id = ? AND perm_name = ?');
const STMT_UPDATE = db.prepare('UPDATE cmd_perm_required SET perm_name = ? WHERE guild_id = ? AND perm_name = ?');

module.exports = {
  name       : 'switchall',
  aliases    : [],
  description: 'Déplace toutes les commandes d\'un groupe de permissions vers un autre.',
  usage      : ';switchall <perm_source> <perm_destination>',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const source = args[0]?.toLowerCase();
      const dest   = args[1]?.toLowerCase();
      if (!source || !dest) return message.reply({ embeds: [E.usage(';', 'switchall <perm_source> <perm_destination>')] });
      if (source === dest) return message.reply({ embeds: [E.error('Identique', 'La source et la destination sont identiques.')] });

      const rows   = STMT_LIST.all(message.guild.id, source);
      if (!rows.length) {
        return message.reply({ embeds: [E.error('Groupe vide', `Aucune commande n'est assignée au groupe **${source}**.`)] });
      }

      const result = STMT_UPDATE.run(dest, message.guild.id, source);
      return message.channel.send({
        embeds: [E.success(
          'Permissions déplacées',
          `**${result.changes}** commande(s) déplacée(s) de **${source}** → **${dest}**.\n` +
          rows.map(r => `• \`${r.cmd_name}\``).join('\n'),
        )],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
