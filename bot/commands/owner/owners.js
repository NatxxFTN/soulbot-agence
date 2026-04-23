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

function renderOwnersPanel(guild, page = 0) {
  const all        = storage.listOwners(guild.id);
  const total      = all.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage   = Math.max(0, Math.min(page, totalPages - 1));
  const slice      = all.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('cat_owner')} **Owners du serveur** ${e('cat_owner')}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const statsLine = `${e('ui_chart')} Total : **${total}** owner(s) · ${e('cat_information')} ${guild.name}` +
    (totalPages > 1 ? ` · ${e('btn_tip')} Page ${safePage + 1}/${totalPages}` : '');
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statsLine));

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (total === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_error')} Aucun owner sur ce serveur.\n${e('btn_tip')} Ajoute-en un avec \`;addowner @user\`.`,
    ));
  } else {
    slice.forEach((o, idx) => {
      const globalIdx = safePage * PAGE_SIZE + idx + 1;
      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${globalIdx}.** ${e('ui_user')} <@${o.user_id}>\n` +
            `└─ Ajouté <t:${Math.floor(o.added_at / 1000)}:R> par <@${o.added_by}>`,
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`owners:remove:${o.user_id}`)
            .setLabel('Retirer')
            .setEmoji(forButton('btn_trash'))
            .setStyle(ButtonStyle.Danger),
        );
      container.addSectionComponents(section);
    });
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (totalPages > 1) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`owners:prev:${safePage}`)
          .setLabel('◀ Précédent')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage === 0),
        new ButtonBuilder()
          .setCustomId(`owners:next:${safePage}`)
          .setLabel('Suivant ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage >= totalPages - 1),
        new ButtonBuilder()
          .setCustomId('owners:refresh')
          .setLabel('Actualiser')
          .setEmoji(forButton('btn_search'))
          .setStyle(ButtonStyle.Primary),
      ),
    );
  } else if (total > 0) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('owners:refresh')
          .setLabel('Actualiser')
          .setEmoji(forButton('btn_search'))
          .setStyle(ButtonStyle.Primary),
      ),
    );
  }

  return container;
}

module.exports = {
  name       : 'owners',
  aliases    : ['listowners'],
  category   : 'owner',
  description: 'Affiche la liste des owners du serveur (Buyer+).',
  usage      : ';owners [page]',
  cooldown   : 3,
  guildOnly  : true,

  renderOwnersPanel,

  async execute(message, args) {
    const authorId = message.author.id;
    const guildId  = message.guild.id;

    if (!ac.isBuyer(guildId, authorId)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_error')} **Accès refusé**`));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_lock')} Seuls les **Buyers** et le **BotOwner** peuvent consulter la liste des owners.`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const page  = parseInt(args[0], 10);
    const panel = renderOwnersPanel(message.guild, isNaN(page) ? 0 : page - 1);
    await message.reply({
      components: [panel],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
