'use strict';

const {
  PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');

function reply(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

module.exports = {
  name       : 'blacklist',
  aliases    : ['bl', 'secblacklist'],
  category   : 'protection',
  description: 'Blacklist utilisateur — suppression auto de ses messages.',
  usage      : ';blacklist <add|remove|list> [@user] [raison]',
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
      const bl = storage.listBlacklist(guildId);
      const container = new ContainerBuilder().setAccentColor(0xFF0000);
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Blacklist serveur** · ${bl.length} entrée(s)`,
      ));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      if (bl.length === 0) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_tip')} Personne n'est blacklisté.`));
      } else {
        const lines = bl.slice(0, 25).map(b =>
          `• <@${b.user_id}> · ${b.reason ? `\`${b.reason.slice(0, 80)}\`` : '*sans raison*'} · par <@${b.added_by}> <t:${Math.floor(b.added_at / 1000)}:R>`,
        );
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
      }
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (sub === 'add' || sub === 'remove') {
      const target = message.mentions.users.first();
      const userId = target?.id || (args[1]?.match(/(\d{17,20})/)?.[1] ?? null);
      if (!userId) {
        return reply(message, `${e('btn_error')} Mentionne l'utilisateur ou donne son ID.`);
      }

      if (sub === 'add') {
        if (userId === message.author.id) {
          return reply(message, `${e('btn_error')} Tu ne peux pas te blacklister toi-même.`);
        }
        const reason = args.slice(2).join(' ') || null;
        storage.addBlacklist(guildId, userId, reason, message.author.id);
        return reply(message,
          `${e('btn_success')} <@${userId}> blacklisté.\n` +
          `${e('btn_tip')} Tous ses prochains messages seront auto-supprimés par le listener sécurité.` +
          (reason ? `\n${e('cat_information')} Raison : ${reason}` : ''),
        );
      } else {
        const ok = storage.removeBlacklist(guildId, userId);
        if (!ok) return reply(message, `${e('btn_error')} <@${userId}> n'était pas blacklisté.`);
        return reply(message, `${e('btn_success')} <@${userId}> retiré de la blacklist.`);
      }
    }

    return reply(message,
      `${e('cat_information')} **Usage**\n` +
      `\`;blacklist add @user [raison]\`\n` +
      `\`;blacklist remove @user\`\n` +
      `\`;blacklist list\``,
    );
  },
};
