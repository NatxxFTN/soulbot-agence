'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'roleCreate',

  async execute(role) {
    const hex = role.color ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';

    await L.log(role.guild, 'role_create', {
      description: `Un nouveau rôle **${role.name}** a été créé.`,
      fields: [
        { name: 'Rôle',     value: role.toString(),   inline: true },
        { name: 'ID',       value: `\`${role.id}\``,  inline: true },
        { name: 'Couleur',  value: hex,               inline: true },
        { name: 'Position', value: `${role.position}`, inline: true },
      ],
      summary: `Rôle créé : ${role.name}`,
    });
  },
};
