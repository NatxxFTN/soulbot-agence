'use strict';

const { PermissionFlagsBits } = require('discord.js');
const {
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

function parseColorArg(raw) {
  if (!raw) return null;
  const m = HEX_RE.exec(raw);
  if (!m) return undefined;
  return parseInt(m[1], 16);
}

module.exports = {
  name       : 'createrole',
  aliases    : ['crole', 'newrole', 'rolecreate'],
  description: 'Créer un nouveau rôle sur le serveur.',
  usage      : ';createrole <nom> [couleur hex] [--hoist] [--mentionable]',
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

    if (!args.length) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage',
        description:
          '`;createrole <nom> [couleur hex] [--hoist] [--mentionable]`\n\n' +
          '**Exemple :** `;createrole Élite #FF0000 --hoist --mentionable`',
        category: 'Admin',
      })));
    }

    const flags = new Set();
    const positional = [];
    for (const a of args) {
      if (a.startsWith('--')) flags.add(a.slice(2).toLowerCase());
      else positional.push(a);
    }

    let color;
    const maybeColor = positional[positional.length - 1];
    const parsed = parseColorArg(maybeColor);
    if (parsed !== null) {
      if (parsed === undefined && /^#?[0-9a-fA-F]+$/.test(maybeColor) && maybeColor.replace('#', '').length <= 6) {
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Couleur invalide',
          description: 'Format attendu : hex 6 caractères (ex: `#FF0000`).',
          category: 'Admin',
        })));
      }
      if (parsed !== undefined) {
        color = parsed;
        positional.pop();
      }
    }

    const name = positional.join(' ').trim().slice(0, 100);
    if (!name) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Nom manquant',
        description: 'Précise un nom pour le rôle (max 100 caractères).',
        category: 'Admin',
      })));
    }

    if (message.guild.roles.cache.some(r => r.name.toLowerCase() === name.toLowerCase())) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Nom existant',
        description: `Un rôle nommé **${name}** existe déjà.`,
        category: 'Admin',
      })));
    }

    if (message.guild.roles.cache.size >= 250) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Limite atteinte',
        description: 'Discord limite à 250 rôles par serveur.',
        category: 'Admin',
      })));
    }

    let role;
    try {
      role = await message.guild.roles.create({
        name,
        color      : color ?? undefined,
        hoist      : flags.has('hoist'),
        mentionable: flags.has('mentionable') || flags.has('mention'),
        reason     : `Créé par ${message.author.tag} via ;createrole`,
      });
    } catch (err) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Erreur API',
        description: `Impossible de créer le rôle : ${err.message}`,
        category: 'Admin',
      })));
    }

    return message.reply(toEmbedReply(successEmbed({
      title       : 'Rôle créé',
      description : `${role.toString()} — créé avec succès.`,
      fields      : [
        { name: '🆔 ID',        value: `\`${role.id}\``,                                                       inline: true },
        { name: '🎨 Couleur',   value: color ? `\`#${color.toString(16).padStart(6, '0').toUpperCase()}\`` : '*Aucune*', inline: true },
        { name: '📊 Position',  value: `\`${role.position}\``,                                                 inline: true },
        { name: '📌 Épinglé',   value: flags.has('hoist') ? '✅' : '❌',                                       inline: true },
        { name: '💬 Mentionnable', value: flags.has('mentionable') || flags.has('mention') ? '✅' : '❌',     inline: true },
        { name: '👤 Par',       value: message.author.tag,                                                     inline: true },
      ],
      user        : message.author,
      category    : 'Admin',
    })));
  },
};
