'use strict';

const { e } = require('../../core/emojis');
const {
  newContainer, buildHeader, separator, text, toV2Payload, infoEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

const MAX_ROLES_DISPLAY = 40;

module.exports = {
  name       : 'rolelist',
  aliases    : ['roles', 'listroles'],
  description: 'Lister tous les rôles du serveur triés par position.',
  usage      : ';rolelist',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message) {
    const roles = message.guild.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position);

    if (!roles.size) {
      return message.reply(toEmbedReply(infoEmbed({
        title       : 'Aucun rôle',
        description : 'Ce serveur ne possède aucun rôle personnalisé.',
        category    : 'Admin',
      })));
    }

    const shown = roles.first(MAX_ROLES_DISPLAY);
    const hidden = roles.size - shown.length;

    const hoisted = roles.filter(r => r.hoist).size;
    const mentionable = roles.filter(r => r.mentionable).size;
    const managed = roles.filter(r => r.managed).size;

    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'ui_members',
      title    : `Rôles du serveur — ${message.guild.name}`,
      subtitle : `**${roles.size}** rôle(s) total · Limite Discord : 250`,
    });

    container.addTextDisplayComponents(
      text(
        `## Statistiques\n` +
        `• ${e('ui_pin') || '📌'} Épinglés (hoist) : **${hoisted}**\n` +
        `• ${e('ui_chat') || '💬'} Mentionnables : **${mentionable}**\n` +
        `• 🔗 Managés (intégrations) : **${managed}**`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    const lines = shown.map((r, i) => {
      const hex = r.color ? `\`#${r.color.toString(16).padStart(6, '0').toUpperCase()}\`` : '`—`';
      const count = r.members.size;
      const flag = r.managed ? ' 🔗' : r.hoist ? ' 📌' : '';
      return `\`${String(i + 1).padStart(2, '0')}.\` ${r.toString()} ${hex} · **${count}** membre(s)${flag}`;
    });

    // Chunks de 15 pour éviter les limites 4000 chars par TextDisplay
    const chunkSize = 15;
    for (let i = 0; i < lines.length; i += chunkSize) {
      container.addTextDisplayComponents(text(lines.slice(i, i + chunkSize).join('\n')));
    }

    if (hidden > 0) {
      container.addSeparatorComponents(separator('Small'));
      container.addTextDisplayComponents(
        text(`*… et **${hidden}** rôle(s) supplémentaire(s) non affiché(s).*`),
      );
    }

    container.addTextDisplayComponents(text(`-# Soulbot • Admin • Roles v1.0`));

    return message.reply(toV2Payload(container));
  },
};
