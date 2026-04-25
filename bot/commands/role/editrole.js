'use strict';

const { PermissionFlagsBits } = require('discord.js');
const {
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

function parseColorArg(raw) {
  if (!raw) return undefined;
  const m = HEX_RE.exec(raw);
  return m ? parseInt(m[1], 16) : undefined;
}

function parseBoolArg(raw) {
  if (raw == null) return null;
  const v = raw.toLowerCase();
  if (['true', 'yes', 'on', 'oui', '1'].includes(v)) return true;
  if (['false', 'no', 'off', 'non', '0'].includes(v)) return false;
  return null;
}

module.exports = {
  name       : 'editrole',
  aliases    : ['erole', 'roleedit', 'modrole'],
  description: 'Modifier un rôle (nom, couleur, hoist, mentionable).',
  usage      : ';editrole @rôle <name|color|hoist|mentionable> <valeur>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Permission manquante',
        description: 'Je n\'ai pas la permission de gérer les rôles.',
        category: 'Admin',
      })));
    }

    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage',
        description:
          '`;editrole @rôle <name|color|hoist|mentionable> <valeur>`\n\n' +
          '**Exemple :** `;editrole @Élite color #FF0000`',
        category: 'Admin',
      })));
    }

    if (role.managed) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Rôle managé',
        description: 'Ce rôle est géré par une intégration et ne peut pas être modifié.',
        category: 'Admin',
      })));
    }

    if (role.id === message.guild.id) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Rôle protégé',
        description: 'Impossible de modifier le rôle @everyone.',
        category: 'Admin',
      })));
    }

    const botMember = message.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Hiérarchie insuffisante',
        description: 'Ce rôle est supérieur ou égal au mien — impossible de le modifier.',
        category: 'Admin',
      })));
    }

    if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Hiérarchie insuffisante',
        description: 'Ce rôle est supérieur ou égal au tien.',
        category: 'Admin',
      })));
    }

    const field = (args[1] ?? '').toLowerCase();
    const valueRaw = args.slice(2).join(' ').trim();

    const changes = {};
    let summary;
    let previousValue;

    switch (field) {
      case 'name':
      case 'nom': {
        if (!valueRaw) return message.reply(toEmbedReply(errorEmbed({ title: 'Valeur manquante', description: 'Précise le nouveau nom (max 100 caractères).', category: 'Admin' })));
        const newName = valueRaw.slice(0, 100);
        if (message.guild.roles.cache.some(r => r.id !== role.id && r.name.toLowerCase() === newName.toLowerCase())) {
          return message.reply(toEmbedReply(warningEmbed({ title: 'Nom existant', description: `Un autre rôle nommé **${newName}** existe déjà.`, category: 'Admin' })));
        }
        previousValue = role.name;
        changes.name = newName;
        summary = { field: 'Nom', before: role.name, after: newName };
        break;
      }
      case 'color':
      case 'couleur': {
        const color = parseColorArg(valueRaw);
        if (color === undefined) {
          return message.reply(toEmbedReply(errorEmbed({ title: 'Couleur invalide', description: 'Format attendu : hex 6 caractères (ex: `#FF0000`).', category: 'Admin' })));
        }
        const before = role.color ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';
        changes.color = color;
        summary = { field: 'Couleur', before, after: `#${color.toString(16).padStart(6, '0').toUpperCase()}` };
        break;
      }
      case 'hoist':
      case 'pin':
      case 'epingle': {
        const bool = parseBoolArg(valueRaw);
        if (bool === null) {
          return message.reply(toEmbedReply(errorEmbed({ title: 'Valeur invalide', description: 'Utilise `true` ou `false`.', category: 'Admin' })));
        }
        changes.hoist = bool;
        summary = { field: 'Épinglé', before: role.hoist ? '✅' : '❌', after: bool ? '✅' : '❌' };
        break;
      }
      case 'mentionable':
      case 'mention': {
        const bool = parseBoolArg(valueRaw);
        if (bool === null) {
          return message.reply(toEmbedReply(errorEmbed({ title: 'Valeur invalide', description: 'Utilise `true` ou `false`.', category: 'Admin' })));
        }
        changes.mentionable = bool;
        summary = { field: 'Mentionnable', before: role.mentionable ? '✅' : '❌', after: bool ? '✅' : '❌' };
        break;
      }
      default:
        return message.reply(toEmbedReply(warningEmbed({
          title: 'Champ invalide',
          description: 'Champs supportés : `name`, `color`, `hoist`, `mentionable`.',
          category: 'Admin',
        })));
    }

    try {
      await role.edit(changes, `Modifié par ${message.author.tag} via ;editrole`);
    } catch (err) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Erreur API',
        description: `Impossible de modifier le rôle : ${err.message}`,
        category: 'Admin',
      })));
    }

    return message.reply(toEmbedReply(successEmbed({
      title       : 'Rôle modifié',
      description : `${role.toString()} — modification appliquée.`,
      fields      : [
        { name: '⚙️ Champ',   value: summary.field,  inline: true },
        { name: '⬅️ Avant',   value: summary.before, inline: true },
        { name: '➡️ Après',   value: summary.after,  inline: true },
        { name: '👤 Par',     value: message.author.tag, inline: false },
      ],
      user        : message.author,
      category    : 'Admin',
    })));
  },
};
