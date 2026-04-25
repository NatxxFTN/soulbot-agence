'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'roleUpdate',

  async execute(oldRole, newRole) {
    const diffs = [];
    if (oldRole.name !== newRole.name) diffs.push(`**Nom** : \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color) {
      const oh = oldRole.color ? `#${oldRole.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';
      const nh = newRole.color ? `#${newRole.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';
      diffs.push(`**Couleur** : \`${oh}\` → \`${nh}\``);
    }
    if (oldRole.hoist !== newRole.hoist) diffs.push(`**Épinglé** : ${oldRole.hoist ? 'Oui' : 'Non'} → ${newRole.hoist ? 'Oui' : 'Non'}`);
    if (oldRole.mentionable !== newRole.mentionable) diffs.push(`**Mentionnable** : ${oldRole.mentionable ? 'Oui' : 'Non'} → ${newRole.mentionable ? 'Oui' : 'Non'}`);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) diffs.push('**Permissions** modifiées');

    if (!diffs.length) return; // changement non-significatif (ex: position)

    await L.log(newRole.guild, 'role_update', {
      description: diffs.join('\n'),
      fields: [
        { name: 'Rôle', value: newRole.toString(),  inline: true },
        { name: 'ID',   value: `\`${newRole.id}\``, inline: true },
      ],
      summary: `Rôle modifié : ${newRole.name}`,
    });
  },
};
