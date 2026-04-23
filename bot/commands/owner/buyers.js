'use strict';

const {
  ContainerBuilder, TextDisplayBuilder, SectionBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { e, forButton } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/access-storage');

const PAGE_SIZE = 10;

function renderBuyersPanel(guild, page = 0) {
  const all        = storage.listBuyers(guild.id);
  const total      = all.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage   = Math.max(0, Math.min(page, totalPages - 1));
  const slice      = all.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  // Header
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Buyers du serveur** ${e('ani_diamond')}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Stats
  const statsLine = `${e('ui_chart')} Total : **${total}** buyer(s) · ${e('cat_information')} ${guild.name}` +
    (totalPages > 1 ? ` · ${e('btn_tip')} Page ${safePage + 1}/${totalPages}` : '');
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statsLine));

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (total === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_error')} Aucun buyer sur ce serveur.\n${e('btn_tip')} Ajoute-en un avec \`;buyer @user\`.`,
    ));
  } else {
    slice.forEach((b, idx) => {
      const globalIdx = safePage * PAGE_SIZE + idx + 1;
      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${globalIdx}.** ${e('ui_user')} <@${b.user_id}>\n` +
            `└─ Ajouté <t:${Math.floor(b.added_at / 1000)}:R> par <@${b.added_by}>`,
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`buyers:remove:${b.user_id}`)
            .setLabel('Retirer')
            .setEmoji(forButton('btn_trash'))
            .setStyle(ButtonStyle.Danger),
        );
      container.addSectionComponents(section);
    });
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Navigation
  if (totalPages > 1) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buyers:prev:${safePage}`)
          .setLabel('◀ Précédent')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage === 0),
        new ButtonBuilder()
          .setCustomId(`buyers:next:${safePage}`)
          .setLabel('Suivant ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage >= totalPages - 1),
        new ButtonBuilder()
          .setCustomId('buyers:refresh')
          .setLabel('Actualiser')
          .setEmoji(forButton('btn_search'))
          .setStyle(ButtonStyle.Primary),
      ),
    );
  } else if (total > 0) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('buyers:refresh')
          .setLabel('Actualiser')
          .setEmoji(forButton('btn_search'))
          .setStyle(ButtonStyle.Primary),
      ),
    );
  }

  return container;
}

module.exports = {
  name       : 'buyers',
  aliases    : ['listbuyers'],
  category   : 'owner',
  description: 'Affiche la liste des buyers du serveur (BotOwner only).',
  usage      : ';buyers [page]',
  cooldown   : 3,
  guildOnly  : true,

  renderBuyersPanel,

  async execute(message, args) {
    const authorId = message.author.id;

    if (!ac.isBotOwner(authorId)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Accès refusé**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_lock')} Seul le **BotOwner** peut consulter la liste des buyers.`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const page  = parseInt(args[0], 10);
    const panel = renderBuyersPanel(message.guild, isNaN(page) ? 0 : page - 1);
    await message.reply({
      components: [panel],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
