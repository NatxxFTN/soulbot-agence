'use strict';

const {
  ContainerBuilder, TextDisplayBuilder, SectionBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { e, forButton } = require('../../core/emojis');
const storage = require('../../core/custom-commands-storage');

const PAGE_SIZE = 10;

/**
 * Rend le panel central des commandes custom.
 * Retourne UN ContainerBuilder (le caller enveloppe dans { components, flags }).
 */
function renderCustomPanel(guild, page = 0, _client) {
  const { items, total, pages, page: safePage } = storage.listCommands(guild.id, page, PAGE_SIZE);
  const usesMonth = storage.getTotalUsesThisMonth(guild.id);
  const top       = storage.getTopCommands(guild.id, 1);

  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  // ── Titre ─────────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Commandes Custom** ${e('ani_diamond')}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Stats ─────────────────────────────────────────────────────────────────
  const topLine = top[0]
    ? `${e('cat_owner')} Top cmd : \`;${top[0].name}\` (${top[0].uses_count} uses)`
    : `${e('cat_owner')} Top cmd : *aucune*`;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('cat_information')} **${total}/${storage.MAX_PER_GUILD}** commandes créées\n` +
      `${e('cat_giveaway')} **${usesMonth}** utilisations ce mois\n` +
      topLine,
    ),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Liste ─────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_error')} Aucune commande custom sur ce serveur.\n` +
      `${e('btn_tip')} Clique sur **Ajouter** pour en créer une.`,
    ));
  } else {
    items.forEach((cmd, idx) => {
      const globalIdx = safePage * PAGE_SIZE + idx + 1;
      const typeIcon  = cmd.response_type === 'embed' ? e('ui_page') : e('ui_chat');

      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${globalIdx}.** ${e('btn_edit')} \`;${cmd.name}\` · **${cmd.uses_count}** uses\n` +
            `└─ Par <@${cmd.created_by}> · ${typeIcon} ${cmd.response_type}`,
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`custom:quickedit:${cmd.id}`)
            .setLabel('Modifier')
            .setEmoji(forButton('btn_edit'))
            .setStyle(ButtonStyle.Primary),
        );
      container.addSectionComponents(section);
    });
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Actions principales ───────────────────────────────────────────────────
  const canAdd = total < storage.MAX_PER_GUILD;
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('custom:add')
        .setLabel('Ajouter')
        .setEmoji(forButton('btn_success'))
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canAdd),
      new ButtonBuilder()
        .setCustomId('custom:remove_menu')
        .setLabel('Supprimer')
        .setEmoji(forButton('btn_trash'))
        .setStyle(ButtonStyle.Danger)
        .setDisabled(total === 0),
      new ButtonBuilder()
        .setCustomId('custom:edit_menu')
        .setLabel('Éditer')
        .setEmoji(forButton('btn_edit'))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(total === 0),
    ),
  );

  // ── Navigation ────────────────────────────────────────────────────────────
  if (pages > 1 || total > 0) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`custom:prev:${safePage}`)
          .setLabel('◀ Précédent')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage === 0),
        new ButtonBuilder()
          .setCustomId(`custom:next:${safePage}`)
          .setLabel('Suivant ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage >= pages - 1),
        new ButtonBuilder()
          .setCustomId('custom:refresh')
          .setLabel('Actualiser')
          .setEmoji(forButton('btn_search'))
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('custom:stats')
          .setLabel('Stats')
          .setEmoji(forButton('cat_information'))
          .setStyle(ButtonStyle.Primary),
      ),
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('btn_tip')} Variables disponibles : \`{user}\`, \`{server}\`, \`{membercount}\`, \`{random:a|b|c}\`, \`{date}\`, \`{timestamp}\`…`,
  ));

  return container;
}

module.exports = { renderCustomPanel };
