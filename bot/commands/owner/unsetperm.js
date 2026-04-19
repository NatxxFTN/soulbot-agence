'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_REMOVE_ROLE  = db.prepare('DELETE FROM perm_groups WHERE guild_id = ? AND perm_name = ? AND role_id = ?');
const STMT_REMOVE_GROUP = db.prepare('DELETE FROM perm_groups WHERE guild_id = ? AND perm_name = ?');
const STMT_CHECK        = db.prepare('SELECT 1 FROM perm_groups WHERE guild_id = ? AND perm_name = ? AND role_id = ?');

module.exports = {
  name       : 'unsetperm',
  aliases    : [],
  description: 'Retire un rôle d\'un groupe de permissions custom (ou supprime le groupe).',
  usage      : ';unsetperm <permission> <@role/id/everyone|all>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const permName = args[0]?.toLowerCase();
      if (!permName) return message.reply({ embeds: [E.usage(';', 'unsetperm <permission> <@role/id/everyone|all>')] });

      const target = args[1]?.toLowerCase();
      if (!target) return message.reply({ embeds: [E.usage(';', 'unsetperm <permission> <@role/id/everyone|all>')] });

      // all = supprime tout le groupe
      if (target === 'all') {
        const result = STMT_REMOVE_GROUP.run(message.guild.id, permName);
        if (!result.changes) return message.reply({ embeds: [E.error('Non trouvé', `Le groupe **${permName}** n'existe pas.`)] });
        return message.channel.send({ embeds: [E.success('Groupe supprimé', `Le groupe **${permName}** a été entièrement supprimé.`)] });
      }

      let roleId;
      if (target === 'everyone') {
        roleId = message.guild.id;
      } else {
        const role = message.mentions.roles.first() ?? message.guild.roles.cache.get(args[1]);
        if (!role) return message.reply({ embeds: [E.error('Rôle introuvable', 'Mentionne un rôle valide ou utilise `everyone` / `all`.')] });
        roleId = role.id;
      }

      if (!STMT_CHECK.get(message.guild.id, permName, roleId)) {
        return message.reply({ embeds: [E.error('Non trouvé', `Ce rôle n'est pas dans le groupe **${permName}**.`)] });
      }

      STMT_REMOVE_ROLE.run(message.guild.id, permName, roleId);
      const mention = roleId === message.guild.id ? '@everyone' : `<@&${roleId}>`;
      return message.channel.send({
        embeds: [E.success('Permission retirée', `${mention} retiré du groupe **${permName}**.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
