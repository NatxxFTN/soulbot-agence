'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/custom-commands-storage');

module.exports = {
  name       : 'customlist',
  aliases    : ['clist', 'customs'],
  category   : 'configuration',
  description: 'Liste paginée des commandes custom du serveur.',
  usage      : ';customlist [page]',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, args) {
    const guildId = message.guild.id;

    if (!ac.hasAccess(guildId, message.author.id)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Accès refusé** — Niveau Owner+ requis.`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const pageArg = parseInt(args[0], 10);
    const page    = isNaN(pageArg) ? 0 : Math.max(0, pageArg - 1);

    const { items, total, pages, page: safePage } = storage.listCommands(guildId, page, 10);
    const usesMonth = storage.getTotalUsesThisMonth(guildId);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Commandes Custom** ${e('ani_diamond')}`),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const statsLine =
      `${e('cat_information')} **${total}/${storage.MAX_PER_GUILD}** commandes` +
      ` · ${e('cat_giveaway')} **${usesMonth}** uses ce mois` +
      (pages > 1 ? ` · ${e('btn_tip')} Page ${safePage + 1}/${pages}` : '');
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statsLine));

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (items.length === 0) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} Aucune commande custom sur ce serveur.\n${e('btn_tip')} Crée-en une avec \`;customadd <nom> <réponse>\`.`,
      ));
    } else {
      const lines = items.map((c, i) => {
        const globalIdx = safePage * 10 + i + 1;
        return `**${globalIdx}.** \`;${c.name}\` · **${c.uses_count}** uses · par <@${c.created_by}>`;
      });
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_tip')} Panel complet : \`;custom\`` +
        (pages > 1 ? ` · Navigation : \`;customlist <page>\`` : ''),
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
