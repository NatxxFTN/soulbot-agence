'use strict';

const L = require('../../core/logs-v3-helper');
const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');
const { e } = require('../../core/emojis');

// Nom fonctionnel — matché par r.name (quarantine + unquarantine), ne pas modifier.
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
        `${e('ui_lock')} Quarantine — Confirmation`,
        `**Cible** : ${target.user.tag} \`${target.id}\`\n` +
        `**Rôles à retirer** : ${rolesPreview}\n` +
        `**Raison** : ${reason}`,
        `;quarantine confirm <@${target.id}> ${reason}`,
      ));
    }

    const result = await quarantineMember(message.guild, target, message.author, reason);
    if (!result.ok) {
      return message.reply(P.dangerPanel('Erreur', result.error));
    }

    return message.reply(P.successPanel(
      `${e('ui_lock')} Quarantine appliquée`,
      `**${target.user.tag}** isolé. ${result.savedRoles} rôle(s) sauvegardé(s) pour restauration future.\n` +
      `Pour libérer : \`;unquarantine @${target.user.username}\`.`,
    ));
  },
};

/**
 * Cœur de la quarantaine — partagé entre ;quarantine et le dock SOC.
 * NE FAIT PAS les checks de hiérarchie/permissions de l'appelant :
 * c'est la responsabilité du point d'entrée (commande ou handler).
 * @returns {Promise<{ok: boolean, error?: string, savedRoles?: number}>}
 */
async function quarantineMember(guild, target, executor, reason) {
  let qRole;
  try {
    qRole = await ensureQuarantineRole(guild);
  } catch {
    return { ok: false, error: 'Impossible de créer/trouver le rôle Quarantine (permissions ?).' };
  }

  const originalRoles = [...target.roles.cache.values()]
    .filter(r => r.id !== guild.roles.everyone.id && !r.managed)
    .map(r => r.id);

  try {
    await target.roles.set([qRole.id], `Quarantine par ${executor.tag}: ${reason}`);
  } catch {
    return { ok: false, error: 'Impossible de modifier les rôles du membre (permissions ?).' };
  }

  audit.quarantineUser(guild.id, target.id, executor.id, reason, originalRoles);
  audit.recordModAction(guild.id, target.id, executor.id, 'QUARANTINE', reason);

  L.log(guild, 'mod_warn', {
    user: target.user, member: target, executor, reason,
    summary: `${target.user.tag} mis en quarantaine par ${executor.tag}`,
    actorId: executor.id, targetId: target.id,
  });

  target.send(`${e('ui_lock')} Tu as été mis en quarantaine sur **${guild.name}**.\nRaison : ${reason}`).catch(() => {});

  return { ok: true, savedRoles: originalRoles.length };
}

module.exports.quarantineMember = quarantineMember;
module.exports.ensureQuarantineRole = ensureQuarantineRole;
module.exports.getActiveQuarantine = (guildId, userId) => audit.getQuarantine(guildId, userId);
