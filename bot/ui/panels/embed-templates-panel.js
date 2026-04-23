'use strict';

// ── Embed Builder — Panel Templates ──────────────────────────────────────────

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const { COLORS } = require('../theme');

function _isEmbedEmpty(state) {
  return !state.embed.title
    && !state.embed.description
    && state.embed.fields.length === 0
    && !state.embed.image
    && !state.embed.thumbnail
    && !state.embed.author
    && !state.embed.footer;
}

/**
 * @param {object} state
 * @param {Array<{id:string, name?:string}>} userTemplates
 * @param {Array<{id:string, name?:string}>} guildTemplates
 */
function renderTemplatesPanel(state, userTemplates, guildTemplates) {
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);
  const empty     = _isEmbedEmpty(state);
  const totalTpls = userTemplates.length + guildTemplates.length;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 💾 Templates'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('ui_folder')} Tes templates : **${userTemplates.length}/10** · Serveur : **${guildTemplates.length}/20**`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Listes
  if (userTemplates.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ui_user')} **Tes templates personnels**`),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        userTemplates.map((t, i) => `${i + 1}. ${t.name ?? t.id}`).join('\n'),
      ),
    );
  }

  if (guildTemplates.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ui_folder')} **Templates du serveur**`),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        guildTemplates.map((t, i) => `${i + 1}. ${t.name ?? t.id}`).join('\n'),
      ),
    );
  }

  if (totalTpls === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Aucun template sauvegardé.*'),
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Sauvegarder
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('emb:tpl:save_user')
        .setLabel('💾 Sauver (perso)')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(empty || userTemplates.length >= 10),
      new ButtonBuilder()
        .setCustomId('emb:tpl:save_guild')
        .setLabel('💾 Sauver (serveur)')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(empty || guildTemplates.length >= 20),
    ),
  );

  // Charger
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('emb:tpl:load_menu')
        .setLabel('📂 Charger')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalTpls === 0),
    ),
  );

  // Gérer
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('emb:tpl:rename')
        .setLabel('✏️ Renommer')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalTpls === 0),
      new ButtonBuilder()
        .setCustomId('emb:tpl:delete')
        .setLabel('🗑️ Supprimer')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(totalTpls === 0),
    ),
  );

  // Retour
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('emb:tpl:back')
        .setLabel('← Retour constructeur')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return container;
}

module.exports = { renderTemplatesPanel };
