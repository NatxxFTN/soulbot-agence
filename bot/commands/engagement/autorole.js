'use strict';

const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LIST = db.prepare('SELECT role_id FROM guild_autoroles WHERE guild_id = ?');
const STMT_INS = db.prepare('INSERT OR IGNORE INTO guild_autoroles (guild_id, role_id, added_by) VALUES (?, ?, ?)');
const STMT_DEL = db.prepare('DELETE FROM guild_autoroles WHERE guild_id = ? AND role_id = ?');
const STMT_COUNT = db.prepare('SELECT COUNT(*) AS n FROM guild_autoroles WHERE guild_id = ?');

const MAX_AUTOROLES = 5;

module.exports = {
  name       : 'autorole',
  aliases    : ['autorl'],
  description: 'Donne automatiquement un rôle à chaque nouveau membre (max 5).',
  usage      : ';autorole <add|remove|list> <@role>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const sub = (args[0] || 'list').toLowerCase();
    const guildId = message.guild.id;

    if (sub === 'list') {
      const rows = STMT_LIST.all(guildId);
      const lines = rows.length ? rows.map(r => `<@&${r.role_id}>`).join('\n') : '_aucun_';
      return message.reply({ embeds: [E.base().setTitle('🎭 Autoroles').setDescription(lines)] });
    }

    if (sub === 'add' || sub === 'remove') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply({ embeds: [E.error('Rôle manquant', 'Mentionne un rôle.')] });

      if (sub === 'add') {
        const { n } = STMT_COUNT.get(guildId);
        if (n >= MAX_AUTOROLES) {
          return message.reply({ embeds: [E.error('Limite atteinte', `Max ${MAX_AUTOROLES} autoroles.`)] });
        }
        if (role.position >= message.guild.members.me.roles.highest.position) {
          return message.reply({ embeds: [E.error('Hiérarchie', 'Mon rôle doit être au-dessus.')] });
        }
        STMT_INS.run(guildId, role.id, message.author.id);
        return message.reply({ embeds: [E.success('Autorole ajouté', `${role} sera donné aux nouveaux membres.`)] });
      }
      STMT_DEL.run(guildId, role.id);
      return message.reply({ embeds: [E.success('Autorole retiré', `${role} ne sera plus donné.`)] });
    }

    return message.reply({ embeds: [E.error('Usage', '`;autorole <add|remove|list> <@role>`')] });
  },
};
