'use strict';

const { e } = require('../../core/emojis');
const {
  newContainer, buildHeader, separator, text, toV2Payload, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

const KEY_PERMISSIONS = [
  'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
  'ManageMessages', 'ManageWebhooks', 'ManageNicknames', 'ManageEmojisAndStickers',
  'KickMembers', 'BanMembers', 'MentionEveryone', 'ViewAuditLog',
  'ModerateMembers',
];

module.exports = {
  name       : 'roleinfo',
  aliases    : ['ri', 'infoRole', 'infosrole'],
  description: 'Afficher les détails complets d\'un rôle.',
  usage      : ';roleinfo @rôle',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    let role = message.mentions.roles.first();
    if (!role && args[0]) {
      role = message.guild.roles.cache.get(args[0])
        || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
    }

    if (!role) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Rôle introuvable',
        description: 'Usage : `;roleinfo @rôle` — mention, ID ou nom exact.',
        category: 'Admin',
      })));
    }

    const hex = role.color ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';
    const createdTs = Math.floor(role.createdTimestamp / 1000);

    const keyPerms = KEY_PERMISSIONS.filter(p => role.permissions.has(p));
    const permsDisplay = keyPerms.length
      ? keyPerms.map(p => `\`${p}\``).join(' · ')
      : '*Aucune permission clé*';

    const container = newContainer();
    // On force l'accent à la couleur du rôle si définie, sinon rouge Soulbot
    if (role.color) container.setAccentColor(role.color);

    buildHeader(container, {
      emojiKey : 'ui_diamond',
      title    : `Rôle : ${role.name}`,
      subtitle : `<@&${role.id}> · \`${role.id}\``,
    });

    container.addTextDisplayComponents(
      text(
        `## Identité\n` +
        `• **Couleur :** \`${hex}\`\n` +
        `• **Position :** \`${role.position}\`\n` +
        `• **Membres :** **${role.members.size}**`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    container.addTextDisplayComponents(
      text(
        `## Propriétés\n` +
        `• ${role.hoist ? '✅' : '❌'} Épinglé (hoist)\n` +
        `• ${role.mentionable ? '✅' : '❌'} Mentionnable\n` +
        `• ${role.managed ? '🔗 Managé (intégration)' : '❌ Non managé'}`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    container.addTextDisplayComponents(
      text(
        `## ${e('ui_lock') || '🔒'} Permissions clés (${keyPerms.length})\n${permsDisplay.slice(0, 1500)}`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    container.addTextDisplayComponents(
      text(`## ${e('btn_calendar') || '📅'} Créé\n<t:${createdTs}:F> · <t:${createdTs}:R>`),
    );

    container.addTextDisplayComponents(text(`-# Soulbot • Admin • RoleInfo v1.0`));

    return message.reply(toV2Payload(container));
  },
};
