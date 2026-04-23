'use strict';

const {
  PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');

const TYPES = new Set(['user', 'role', 'channel']);

function reply(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

function extractId(arg, type, message) {
  if (!arg) return null;
  if (type === 'user' && message.mentions.users.size > 0)      return message.mentions.users.first().id;
  if (type === 'role' && message.mentions.roles.size > 0)      return message.mentions.roles.first().id;
  if (type === 'channel' && message.mentions.channels.size > 0) return message.mentions.channels.first().id;
  const m = arg.match(/(\d{17,20})/);
  return m ? m[1] : null;
}

module.exports = {
  name       : 'whitelist',
  aliases    : ['wl', 'secwhitelist'],
  category   : 'protection',
  description: 'Ajoute/retire/liste des entrées whitelist sécurité.',
  usage      : ';whitelist <add|remove|list> [type] [@cible] [feature]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    if (sub === 'list') {
      const featureFilter = args[1] || null;
      const wl = storage.listWhitelist(guildId, null, featureFilter);

      const container = new ContainerBuilder().setAccentColor(0xFF0000);
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_lock')} **Whitelist sécurité** · ${wl.length} entrée(s)${featureFilter ? ` pour \`${featureFilter}\`` : ''}`,
      ));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      if (wl.length === 0) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${e('btn_tip')} Vide.\nAjoute une entrée : \`;whitelist add user @toi\`.`,
        ));
      } else {
        const lines = wl.slice(0, 25).map(w => {
          const mention = w.entity_type === 'user'    ? `<@${w.entity_id}>`
                        : w.entity_type === 'role'    ? `<@&${w.entity_id}>`
                        : `<#${w.entity_id}>`;
          const scope = w.feature ? `\`${w.feature}\`` : '*global*';
          return `• **${w.entity_type}** ${mention} · ${scope} · <t:${Math.floor(w.added_at / 1000)}:R>`;
        });
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
      }
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (sub === 'add' || sub === 'remove') {
      const type    = (args[1] || '').toLowerCase();
      const target  = args[2];
      const feature = args[3] || null;

      if (!TYPES.has(type)) {
        return reply(message, `${e('btn_error')} Type invalide. Utilise \`user\`, \`role\` ou \`channel\`.`);
      }

      const id = extractId(target, type, message);
      if (!id) {
        return reply(message, `${e('btn_error')} Cible invalide. Mentionne le ${type} ou donne son ID.`);
      }

      if (sub === 'add') {
        const ok = storage.addWhitelist(guildId, type, id, feature, message.author.id);
        if (!ok) return reply(message, `${e('btn_error')} Déjà dans la whitelist.`);
        const scope = feature ? ` pour \`${feature}\`` : ' **globalement**';
        return reply(message, `${e('btn_success')} ${type} **${id}** ajouté${scope}.`);
      } else {
        const ok = storage.removeWhitelist(guildId, type, id, feature);
        if (!ok) return reply(message, `${e('btn_error')} Entrée introuvable dans la whitelist.`);
        return reply(message, `${e('btn_trash')} Retiré de la whitelist.`);
      }
    }

    return reply(message,
      `${e('cat_information')} **Usage**\n` +
      `\`;whitelist add <user|role|channel> @cible [feature]\`\n` +
      `\`;whitelist remove <user|role|channel> @cible [feature]\`\n` +
      `\`;whitelist list [feature]\``,
    );
  },
};
