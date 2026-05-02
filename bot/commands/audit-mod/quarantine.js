'use strict';

const L = require('../../core/logs-v3-helper');
const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

const ROLE_NAME = '🔒 Quarantine';

async function ensureQuarantineRole(guild) {
  let role = guild.roles.cache.find(r => r.name === ROLE_NAME);
  if (role) return role;
  role = await guild.roles.create({
    name: ROLE_NAME,
    color: 0x111111,
    permissions: [],
    reason: 'Pack Audit-Mod — création automatique du rôle Quarantine',
  });
  return role;
}

function parseReason(rest) {
  const reasonArgs = rest.filter(a =>
    a !== 'confirm'
    && !a.match(/^<@!?\d+>$/)
    && !a.match(/^\d{15,}$/),
  );
  return reasonArgs.join(' ').trim() || 'Aucune raison fournie';
}

module.exports = {
  name       : 'quarantine',
  aliases    : ['quar', 'isolate'],
  description: 'Isole un membre : retire ses rôles et applique le rôle Quarantine.',
  usage      : ';quarantine @membre [raison]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const isConfirm = args[0] === 'confirm';
    const rest = isConfirm ? args.slice(1) : args;
    const target = message.mentions.members.first();

    if (!target) {
      return message.reply(P.warningPanel('Cible manquante', `Usage : \`${this.usage}\``));
    }
    if (target.user.bot) {
      return message.reply(P.warningPanel('Action impossible', 'On ne met pas un bot en quarantaine.'));
    }
    if (target.id === message.author.id) {
      return message.reply(P.warningPanel('Action impossible', 'Tu ne peux pas te mettre toi-même en quarantaine.'));
    }
    if (target.id === message.guild.ownerId) {
      return message.reply(P.warningPanel('Action impossible', 'Le propriétaire du serveur ne peut pas être mis en quarantaine.'));
    }
    if (audit.getQuarantine(message.guild.id, target.id)) {
      return message.reply(P.warningPanel('Déjà en quarantaine', `${target.user.tag} est déjà isolé. Utilise \`;unquarantine @${target.user.username}\`.`));
    }

    const me = message.guild.members.me;
    if (target.roles.highest.position >= me.roles.highest.position) {
      return message.reply(P.dangerPanel('Hiérarchie insuffisante', `Le rôle le plus haut de ${target.user.tag} est >= au mien. Impossible.`));
    }
    if (message.author.id !== message.guild.ownerId
        && target.roles.highest.position >= message.member.roles.highest.position) {
      return message.reply(P.dangerPanel('Hiérarchie insuffisante', `Tu n'as pas un rôle assez haut pour isoler ${target.user.tag}.`));
    }

    const reason = parseReason(rest);

    if (!isConfirm) {
      const rolesPreview = [...target.roles.cache.values()]
        .filter(r => r.id !== message.guild.roles.everyone.id && !r.managed)
        .map(r => r.name).join(', ') || '*aucun*';

      return message.reply(P.confirmPanel(
        '🔒 Quarantine — Confirmation',
        `**Cible** : ${target.user.tag} \`${target.id}\`\n` +
        `**Rôles à retirer** : ${rolesPreview}\n` +
        `**Raison** : ${reason}`,
        `;quarantine confirm <@${target.id}> ${reason}`,
      ));
    }

    let qRole;
    try {
      qRole = await ensureQuarantineRole(message.guild);
    } catch {
      return message.reply(P.dangerPanel('Erreur', 'Impossible de créer/trouver le rôle Quarantine (permissions ?).'));
    }

    const originalRoles = [...target.roles.cache.values()]
      .filter(r => r.id !== message.guild.roles.everyone.id && !r.managed)
      .map(r => r.id);

    try {
      await target.roles.set([qRole.id], `Quarantine par ${message.author.tag}: ${reason}`);
    } catch {
      return message.reply(P.dangerPanel('Erreur', 'Impossible de modifier les rôles du membre (permissions ?).'));
    }

    audit.quarantineUser(message.guild.id, target.id, message.author.id, reason, originalRoles);
    audit.recordModAction(message.guild.id, target.id, message.author.id, 'QUARANTINE', reason);

    L.log(message.guild, 'mod_warn', {
      user: target.user, member: target, executor: message.author, reason,
      summary: `${target.user.tag} mis en quarantaine par ${message.author.tag}`,
      actorId: message.author.id, targetId: target.id,
    });

    target.send(`🔒 Tu as été mis en quarantaine sur **${message.guild.name}**.\nRaison : ${reason}`).catch(() => {});

    return message.reply(P.successPanel(
      '🔒 Quarantine appliquée',
      `**${target.user.tag}** isolé. ${originalRoles.length} rôle(s) sauvegardé(s) pour restauration future.\n` +
      `Pour libérer : \`;unquarantine @${target.user.username}\`.`,
    ));
  },
};
