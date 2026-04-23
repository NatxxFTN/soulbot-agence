'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/form-storage');

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

module.exports = {
  name       : 'formstats',
  aliases    : [],
  category   : 'configuration',
  description: 'Statistiques d\'un formulaire (par ID).',
  usage      : ';formstats <id>',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const id = parseInt(args[0], 10);
    if (!id) return plain(message, `${e('btn_error')} Usage : \`;formstats <id>\``);

    const form = storage.getForm(id);
    if (!form || form.guild_id !== message.guild.id) {
      return plain(message, `${e('btn_error')} Formulaire introuvable.`);
    }

    const count = storage.countSubmissions(id);
    const subs = storage.listSubmissions(id, 5);

    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_information')} **Statistiques · ${form.title || form.name}**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const createdAt = Math.floor((form.created_at || Date.now()) / 1000);
    const status = form.closed ? `${e('ui_lock')} fermé` : `${e('btn_success')} actif`;

    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**ID** · #${form.id}\n` +
      `**Nom** · \`${form.name}\`\n` +
      `**Statut** · ${status}\n` +
      `**Questions** · ${form.questions.length}\n` +
      `**Réponses** · ${count}\n` +
      `**Créé** · <t:${createdAt}:R>`,
    ));

    if (subs.length) {
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const lines = subs.map(s => {
        const t = Math.floor(s.submitted_at / 1000);
        const user = form.anonymous ? 'anonyme' : `<@${s.user_id}>`;
        return `• ${user} · <t:${t}:R>`;
      });
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_chat')} **Dernières réponses**\n${lines.join('\n')}`,
      ));
    }

    return message.reply({
      components: [ct],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
