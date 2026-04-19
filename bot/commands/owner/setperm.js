'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS perm_groups (
    guild_id  TEXT NOT NULL,
    perm_name TEXT NOT NULL,
    role_id   TEXT NOT NULL,
    PRIMARY KEY (guild_id, perm_name, role_id)
  );
`);

const STMT_ADD    = db.prepare('INSERT OR IGNORE INTO perm_groups (guild_id, perm_name, role_id) VALUES (?, ?, ?)');
const STMT_LIST   = db.prepare('SELECT role_id FROM perm_groups WHERE guild_id = ? AND perm_name = ?');
const STMT_ALL    = db.prepare('SELECT DISTINCT perm_name FROM perm_groups WHERE guild_id = ?');

module.exports = {
  name       : 'setperm',
  aliases    : [],
  description: 'Associe un rôle (ou @everyone) à un groupe de permissions custom.',
  usage      : ';setperm <permission> <@role/id/everyone>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      // ;setperm list — affiche tous les groupes
      if (args[0]?.toLowerCase() === 'list') {
        const groups = STMT_ALL.all(message.guild.id);
        if (!groups.length) return message.channel.send({ embeds: [E.info('Permissions', 'Aucun groupe de permissions défini.')] });
        const lines = groups.map(({ perm_name }) => {
          const roles = STMT_LIST.all(message.guild.id, perm_name).map(r => `<@&${r.role_id}>`).join(', ') || '*aucun rôle*';
          return `**${perm_name}** → ${roles}`;
        }).join('\n');
        return message.channel.send({ embeds: [E.base().setTitle('Groupes de permissions').setDescription(lines)] });
      }

      const permName = args[0]?.toLowerCase();
      if (!permName) return message.reply({ embeds: [E.usage(';', 'setperm <permission> <@role/id/everyone>')] });

      const target = args[1]?.toLowerCase();
      if (!target) return message.reply({ embeds: [E.usage(';', 'setperm <permission> <@role/id/everyone>')] });

      let roleId;
      if (target === 'everyone') {
        roleId = message.guild.id; // @everyone role_id == guild_id
      } else {
        const role = message.mentions.roles.first() ?? message.guild.roles.cache.get(args[1]);
        if (!role) return message.reply({ embeds: [E.error('Rôle introuvable', 'Mentionne un rôle valide ou utilise `everyone`.')] });
        roleId = role.id;
      }

      STMT_ADD.run(message.guild.id, permName, roleId);
      const mention = roleId === message.guild.id ? '@everyone' : `<@&${roleId}>`;
      return message.channel.send({
        embeds: [E.success('Permission définie', `${mention} ajouté au groupe **${permName}**.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
