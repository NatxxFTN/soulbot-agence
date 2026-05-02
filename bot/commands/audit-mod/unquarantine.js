'use strict';

const L = require('../../core/logs-v3-helper');
const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

const ROLE_NAME = '🔒 Quarantine';

module.exports = {
  name       : 'unquarantine',
  aliases    : ['unquar', 'release'],
  description: 'Libère un membre de la quarantaine et restaure ses rôles originaux.',
  usage      : ';unquarantine @membre',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const target = message.mentions.members.first()
      || (args[0] && /^\d{15,}$/.test(args[0]) ? await message.guild.members.fetch(args[0]).catch(() => null) : null);

    if (!target) {
      return message.reply(P.warningPanel('Cible manquante', `Usage : \`${this.usage}\``));
    }

    const record = audit.getQuarantine(message.guild.id, target.id);
    if (!record) {
      return message.reply(P.warningPanel('Pas en quarantaine', `${target.user.tag} n'est pas en quarantaine.`));
    }

    const me = message.guild.members.me;
    if (target.roles.highest.position >= me.roles.highest.position) {
      return message.reply(P.dangerPanel('Hiérarchie insuffisante', `Mon rôle est trop bas pour libérer ${target.user.tag}.`));
    }

    const originalRoleIds = audit.unquarantineUser(message.guild.id, target.id) || [];
    const qRole = message.guild.roles.cache.find(r => r.name === ROLE_NAME);

    const validRoleIds = originalRoleIds.filter(id => message.guild.roles.cache.has(id));

    try {
      await target.roles.set(validRoleIds, `Unquarantine par ${message.author.tag}`);
    } catch {
      return message.reply(P.dangerPanel('Erreur', 'Impossible de restaurer les rôles (permissions ?).'));
    }

    audit.recordModAction(message.guild.id, target.id, message.author.id, 'UNQUARANTINE', `Libération`);

    L.log(message.guild, 'mod_unmute', {
      user: target.user, member: target, executor: message.author,
      reason: 'Libération de quarantaine',
      summary: `${target.user.tag} libéré de la quarantaine par ${message.author.tag}`,
      actorId: message.author.id, targetId: target.id,
    });

    target.send(`🕊️ Tu as été libéré de la quarantaine sur **${message.guild.name}**.`).catch(() => {});

    const lostRoles = originalRoleIds.length - validRoleIds.length;
    return message.reply(P.successPanel(
      '🕊️ Quarantine levée',
      `**${target.user.tag}** libéré. **${validRoleIds.length}** rôle(s) restauré(s)` +
      (lostRoles > 0 ? ` · ${lostRoles} rôle(s) perdu(s) (supprimés depuis).` : '.'),
    ));
  },
};
