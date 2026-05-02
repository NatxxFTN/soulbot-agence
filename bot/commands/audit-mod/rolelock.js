'use strict';

const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

module.exports = {
  name       : 'rolelock',
  aliases    : ['lockrole', 'rl'],
  description: 'Verrouille/déverrouille un rôle (toggle). Restaure auto si modifié par un non-Admin.',
  usage      : ';rolelock @rôle',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    let role = message.mentions.roles.first();

    if (!role && args[0]) {
      const raw = args[0].replace(/[<@&>]/g, '');
      role = message.guild.roles.cache.get(raw)
        || message.guild.roles.cache.find(r => r.name.toLowerCase() === raw.toLowerCase());
    }

    if (!role) {
      const list = audit.listLockedRoles(message.guild.id);
      if (!list.length) {
        return message.reply(P.warningPanel(
          'Rôle manquant',
          `Usage : \`${this.usage}\`\nMentionne un rôle ou passe son ID/nom.\n*Aucun rôle locké actuellement.*`,
        ));
      }
      const items = list.map(l => {
        const r = message.guild.roles.cache.get(l.role_id);
        return `• ${r ? `<@&${r.id}> (\`${r.name}\`)` : `\`${l.role_id}\` (rôle introuvable)`} — locké par <@${l.locked_by}> <t:${l.locked_at}:R>`;
      });
      return message.reply(P.infoPanel('🔐 Rôles lockés', items.join('\n')));
    }

    if (role.id === message.guild.roles.everyone.id) {
      return message.reply(P.warningPanel('Action impossible', 'Le rôle @everyone ne peut pas être locké.'));
    }
    if (role.managed) {
      return message.reply(P.warningPanel('Action impossible', 'Les rôles managés (intégrations bots) ne peuvent pas être lockés.'));
    }

    const wasLocked = audit.isRoleLocked(message.guild.id, role.id);
    if (wasLocked) {
      audit.unlockRole(message.guild.id, role.id);
      return message.reply(P.successPanel(
        '🔓 Rôle déverrouillé',
        `Le rôle **${role.name}** peut désormais être ajouté/retiré normalement.`,
      ));
    }

    audit.lockRole(message.guild.id, role.id, message.author.id);
    return message.reply(P.successPanel(
      '🔐 Rôle verrouillé',
      `Le rôle **${role.name}** est maintenant locké.\n` +
      'Les ajouts/retraits par non-Admins seront automatiquement annulés.',
    ));
  },
};
