'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');
const { scanCommands, getCategoryEmoji } = require('../../core/help-helper');

let _pkg;
function getPkg() {
  if (!_pkg) {
    try { _pkg = require('../../../package.json'); } catch { _pkg = { version: '1.0.0' }; }
  }
  return _pkg;
}

const CMDS_PER_PAGE = 8;
const CATS_PER_PAGE = 10;

// ─── ÉCRAN 1 — Accueil style Mya ─────────────────────────────────────────────

function renderHelpHome(page = 1) {
  const categories = scanCommands();
  const catNames   = Object.keys(categories).sort();

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  if (catNames.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# 📘 Information\n*Aucune commande chargée.*'),
    );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
  }

  const totalCmds  = Object.values(categories).reduce((s, c) => s + c.length, 0);
  const customCnt  = (categories['Custom'] || []).length;
  const version    = getPkg().version || '1.0.0';

  const totalPages = Math.max(1, Math.ceil(catNames.length / CATS_PER_PAGE));
  page = Math.max(1, Math.min(page, totalPages));

  const pageCats   = catNames.slice((page - 1) * CATS_PER_PAGE, page * CATS_PER_PAGE);

  // ── Titre + version ───────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 📘 Information'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`\`\`\`► Version ${version}\`\`\``),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── 2 colonnes : catégories + syntaxes ───────────────────────────────────
  const catsBlock = pageCats
    .map(cat => `${getCategoryEmoji(cat)} ${cat} *(${categories[cat].length})*`)
    .join('\n');

  const extra = catNames.length > CATS_PER_PAGE
    ? `\n*+${catNames.length - CATS_PER_PAGE} autres — utilisez les flèches*`
    : '';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 📂 Catégories\n${catsBlock}${extra}`),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 📖 Syntaxes\n` +
      `\`\`\`\n` +
      `;help <cmd>\n` +
      `<> Obligatoire\n` +
      `[] Optionnel\n` +
      `() Spécification\n` +
      `/  Sépare syntaxes\n` +
      `\n` +
      `Total  : ${totalCmds}\n` +
      `Custom : ${customCnt}\n` +
      `\`\`\``,
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Dropdown catégories ───────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help:category')
        .setPlaceholder('📂 Choisir une catégorie pour voir ses commandes')
        .addOptions(
          catNames.slice(0, 25).map(cat => ({
            label      : cat,
            value      : cat,
            description: `${categories[cat].length} commande${categories[cat].length > 1 ? 's' : ''}`,
            emoji      : getCategoryEmoji(cat),
          })),
        ),
    ),
  );

  // ── Pagination accueil ────────────────────────────────────────────────────
  if (totalPages > 1) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`📄 **Page ${page}/${totalPages}**`),
    );
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('help:home:1')
          .setEmoji('⏮')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId(`help:home:${page - 1}`)
          .setEmoji('◀')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId(`help:home:${page + 1}`)
          .setEmoji('▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages),
        new ButtonBuilder()
          .setCustomId(`help:home:${totalPages}`)
          .setEmoji('⏭')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages),
      ),
    );
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── ÉCRAN 2 — Détails catégorie (préservé de Session 4) ─────────────────────

function renderHelpCategory(category = null, page = 1) {
  const categories = scanCommands();
  const catNames   = Object.keys(categories);

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  if (catNames.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# 📚 Aide Soulbot\n*Aucune commande chargée.*'),
    );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
  }

  if (!category || !categories[category]) category = catNames[0];

  const commands   = categories[category] || [];
  const totalCmds  = Object.values(categories).reduce((s, c) => s + c.length, 0);
  const totalPages = Math.max(1, Math.ceil(commands.length / CMDS_PER_PAGE));
  page = Math.max(1, Math.min(page, totalPages));

  const slice = commands.slice((page - 1) * CMDS_PER_PAGE, page * CMDS_PER_PAGE);

  // ── Titre ─────────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 📚 Aide Soulbot'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${totalCmds} commandes** · **${catNames.length} catégories** · préfixe \`;\``,
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Dropdown catégories ───────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('### 📂 Catégorie'),
  );

  const options = catNames.slice(0, 25).map(cat => ({
    label      : cat,
    value      : cat,
    description: `${categories[cat].length} commande${categories[cat].length > 1 ? 's' : ''}`,
    emoji      : getCategoryEmoji(cat),
    default    : cat === category,
  }));

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help:category')
        .setPlaceholder(`${getCategoryEmoji(category)} ${category}`)
        .addOptions(options),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Commandes ─────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${getCategoryEmoji(category)} ${category}`,
    ),
  );

  if (slice.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Aucune commande dans cette catégorie.*'),
    );
  } else {
    const lines = slice.map(cmd => {
      const badges  = cmd.ownerOnly ? ' 👑' : '';
      const aliases = cmd.aliases.length > 0
        ? ` *(${cmd.aliases.map(a => `\`${a}\``).join(', ')})*`
        : '';
      return `**\`${cmd.usage}\`**${badges}${aliases}\n↳ ${cmd.description}`;
    }).join('\n\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines),
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Pagination ────────────────────────────────────────────────────────────
  if (totalPages > 1) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`📄 **Page ${page}/${totalPages}**`),
    );
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`help:page:${category}:1`)
          .setEmoji('⏮')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId(`help:page:${category}:${page - 1}`)
          .setEmoji('◀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId(`help:page:${category}:${page + 1}`)
          .setEmoji('▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages),
        new ButtonBuilder()
          .setCustomId(`help:page:${category}:${totalPages}`)
          .setEmoji('⏭')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages),
      ),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
  }

  // ── Bas : Accueil + Rechercher ────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help:home:1')
        .setLabel('Accueil')
        .setEmoji('🏠')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help:search')
        .setLabel('Rechercher')
        .setEmoji('🔍')
        .setStyle(ButtonStyle.Primary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Route vers l'écran d'accueil (category = null) ou les détails d'une catégorie.
 */
function renderHelpPanel(category = null, page = 1) {
  if (!category) return renderHelpHome(page);
  return renderHelpCategory(category, page);
}

module.exports = { renderHelpPanel, renderHelpHome, renderHelpCategory };
