'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'roleDelete',

  async execute(role) {
    const hex = role.color ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';

    await L.log(role.guild, 'role_delete', {
      description: `Le rôle **${role.name}** a été supprimé.`,
      fields: [
        { name: 'Nom',      value: `\`${role.name}\``, inline: true },
        { name: 'ID',       value: `\`${role.id}\``,   inline: true },
        { name: 'Couleur',  value: hex,                inline: true },
        { name: 'Membres',  value: `${role.members.size}`, inline: true },
      ],
      summary: `Rôle supprimé : ${role.name}`,
    });
  },
};
