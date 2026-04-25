'use strict';

const { PermissionsBitField } = require('discord.js');
const { e } = require('../../core/emojis');
const {
  newContainer, buildHeader, separator, text, toV2Payload, errorEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

// Liste des perms affichées (ordre pertinent)
const DISPLAY_PERMS = [
  'ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles',
  'AddReactions', 'UseExternalEmojis', 'MentionEveryone', 'ManageMessages',
  'ManageChannels', 'ManageRoles', 'Connect', 'Speak', 'MuteMembers', 'DeafenMembers',
  'MoveMembers', 'UseVAD',
];

module.exports = {
  name        : 'channelpermcheck',
  aliases     : ['permcheck', 'chkperm'],
  description : 'Vérifie les permissions effectives d\'un user/rôle sur un salon',
  usage       : ';channelpermcheck [#salon] [@user|@role]',
  guildOnly   : true,
  permissions : ['ViewChannel'],

  async execute(message, args) {
    // Parse #salon
    let channel = message.channel;
    let offset = 0;
    if (args[0]) {
      const chMatch = args[0].match(/^<#(\d+)>$/) || args[0].match(/^(\d{17,20})$/);
      if (chMatch) {
        const found = message.guild.channels.cache.get(chMatch[1]);
        if (found) { channel = found; offset = 1; }
      }
    }

    // Parse @user / @role (optionnel)
    let subject = message.member;
    let subjectLabel = `${message.author.tag} *(toi)*`;

    if (args[offset]) {
      const userMatch = args[offset].match(/^<@!?(\d+)>$/);
      const roleMatch = args[offset].match(/^<@&(\d+)>$/);
      const rawId     = args[offset].match(/^(\d{17,20})$/);
      if (userMatch || (rawId && message.guild.members.cache.has(rawId[0]))) {
        const id = userMatch?.[1] || rawId[0];
        const m = await message.guild.members.fetch(id).catch(() => null);
        if (m) { subject = m; subjectLabel = m.user.tag; }
      } else if (roleMatch) {
        const r = message.guild.roles.cache.get(roleMatch[1]);
        if (r) { subject = r; subjectLabel = `@${r.name} *(rôle)*`; }
      }
    }

    const perms = channel.permissionsFor(subject);
    if (!perms) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Résolution impossible',
        description: 'Impossible de résoudre les permissions pour ce sujet sur ce salon.',
        category: 'Innovation',
      })));
    }

    // Calcul stats
    const lines = DISPLAY_PERMS.map(p => {
      const flag = PermissionsBitField.Flags[p];
      const has  = perms.has(flag);
      return { perm: p, has };
    });
    const okCount = lines.filter(l => l.has).length;
    const koCount = lines.length - okCount;

    // Panel V2
    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'ui_lock',
      title    : 'Permissions effectives',
      subtitle : `**Salon :** ${channel} \`${channel.name}\`\n**Sujet :** ${subjectLabel}`,
    });

    container.addTextDisplayComponents(
      text(
        `## 🟢 ${okCount} accordée(s) · 🔴 ${koCount} refusée(s) · Total ${lines.length}`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    // Grille 2 colonnes
    const half = Math.ceil(lines.length / 2);
    const col1 = lines.slice(0, half).map(l => `${l.has ? '✅' : '❌'} \`${l.perm}\``).join('\n');
    const col2 = lines.slice(half).map(l => `${l.has ? '✅' : '❌'} \`${l.perm}\``).join('\n');

    container.addTextDisplayComponents(text(col1));
    container.addSeparatorComponents(separator('Small'));
    container.addTextDisplayComponents(text(col2));

    container.addTextDisplayComponents(text(`-# Soulbot • Innovation • PermCheck v1.0`));

    return message.reply(toV2Payload(container));
  },
};
