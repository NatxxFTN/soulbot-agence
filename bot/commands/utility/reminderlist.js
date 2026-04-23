'use strict';

const {
  MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/reminder-storage');

module.exports = {
  name       : 'reminderlist',
  aliases    : ['remindlist', 'rappellist'],
  category   : 'utility',
  description: 'Liste les rappels actifs du serveur.',
  usage      : ';reminderlist',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [],

  async execute(message, _args, _client) {
    const list = storage.listReminders(message.guild.id);
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_utility')} **Rappels actifs** · ${list.length}`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (list.length === 0) {
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Aucun rappel. Crée-en un avec \`;reminder dans 2h <message>\`.`,
      ));
    } else {
      const lines = list.slice(0, 15).map(r => {
        const t = Math.floor(r.trigger_at / 1000);
        const preview = (r.message_content || '').slice(0, 60);
        const rec = r.recurring ? ` · 🔁 ${r.recurring}` : '';
        const state = r.enabled ? '' : ' · *désactivé*';
        return `**#${r.id}** · <t:${t}:R>${rec}${state} · ${preview}`;
      });
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    }

    return message.reply({
      components: [ct],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
