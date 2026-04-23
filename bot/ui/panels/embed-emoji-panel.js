'use strict';

// ── Embed Builder — Panel Emojis ──────────────────────────────────────────────

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
const path = require('path');

const PER_PAGE = 20;

function renderEmojiPanel(state, guild, page = 0) {
  const guildEmojis = [...(guild?.emojis?.cache?.values() ?? [])];
  const totalPages  = Math.max(1, Math.ceil(guildEmojis.length / PER_PAGE));
  const safePage    = Math.min(Math.max(0, page), totalPages - 1);
  const slice       = guildEmojis.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 😀 Emojis disponibles'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('btn_tip')} Copie le code \`:nom:\` et colle-le dans tes champs. Discord le convertira automatiquement.`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Emojis du serveur ──────────────────────────────────────────────────────
  if (guildEmojis.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ui_folder')} **Emojis du serveur** — *aucun emoji custom*`),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('ui_folder')} **Emojis du serveur** — page ${safePage + 1}/${totalPages}`,
      ),
    );
    const lines = slice.map(em => {
      const tag = em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`;
      return `${tag}  \`:${em.name}:\``;
    });
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join('\n') || '*aucun emoji sur cette page*'),
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Emojis Soulbot ────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('⚙️ **Emojis Soulbot**'),
  );

  let soulbotLines = '*non disponible*';
  try {
    const ids     = require(path.join(__dirname, '../../../data/emojis-ids.json'));
    const entries = Object.entries(ids).slice(0, 30);
    const mapped  = entries
      .map(([name, id]) => (id ? `<:${name}:${id}>  \`:${name}:\`` : null))
      .filter(Boolean);
    soulbotLines = mapped.join('\n') || '*aucun emoji Soulbot*';
  } catch { /* fichier absent */ }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(soulbotLines),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Navigation ────────────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`emb:emojis:prev:${safePage}`)
        .setLabel('◀ Précédent')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage === 0),
      new ButtonBuilder()
        .setCustomId(`emb:emojis:next:${safePage}`)
        .setLabel('Suivant ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId('emb:emojis:back')
        .setLabel('← Retour constructeur')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return container;
}

module.exports = { renderEmojiPanel };
