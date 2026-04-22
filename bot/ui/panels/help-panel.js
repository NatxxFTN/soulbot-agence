'use strict';

const {
  EmbedBuilder,
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
const { scanCommands, getCategoryEmoji, getCategoryEmojiObject, getCategoryAnsi } = require('../../core/help-helper');
const { forButton, e } = require('../../core/emojis');

let _pkg;
function getPkg() {
  if (!_pkg) {
    try { _pkg = require('../../../package.json'); } catch { _pkg = { version: '1.0.0' }; }
  }
  return _pkg;
}

const CMDS_PER_PAGE = 8;
const CATS_PER_PAGE = 10;

// ─── Guard unicité customIds ──────────────────────────────────────────────────

function validateUniqueCustomIds(components) {
  const seen = new Set();
  for (const row of components) {
    const rowComponents = row.components ?? [];
    for (const c of rowComponents) {
      const id = c.data?.custom_id ?? c.customId;
      if (!id) continue;
      if (seen.has(id)) {
        throw new Error(`[help-panel] customId dupliqué détecté : "${id}"`);
      }
      seen.add(id);
    }
  }
}

// ─── ÉCRAN 1 — Accueil EmbedBuilder ANSI 2 colonnes ──────────────────────────

function renderHelpHome(page = 1, botAvatarURL = null) {
  const categories = scanCommands();
  const catNames   = Object.keys(categories).sort();

  if (catNames.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.accent)
      .setTitle('📘 Information')
      .setDescription('*Aucune commande chargée.*');
    return { embeds: [embed], components: [] };
  }

  const totalCmds = Object.values(categories).reduce((s, c) => s + c.length, 0);
  const customCnt = (categories['Custom'] || []).length;
  const pkg       = getPkg();
  const version   = pkg.version || '1.0.0';
  const botName   = pkg.name    || 'soulbot';

  const totalPages = Math.max(1, Math.ceil(catNames.length / CATS_PER_PAGE));
  page = Math.max(1, Math.min(page, totalPages));

  const pageCats  = catNames.slice((page - 1) * CATS_PER_PAGE, page * CATS_PER_PAGE);
  const activeCat = pageCats[0] || catNames[0];

  const E = '';

  // Colonne gauche : catégories ANSI
  const catsLines = pageCats.map(cat => `${e('folder')} ${E}[${getCategoryAnsi(cat)}m${cat}${E}[0m`);
  if (catNames.length > CATS_PER_PAGE) {
    catsLines.push(`${E}[90m+${catNames.length - CATS_PER_PAGE} catégories${E}[0m`);
  }
  const categoriesCol = '```ansi\n' + catsLines.join('\n') + '\n```';

  // Colonne droite : syntaxes ANSI
  const syntaxesCol =
    '```ansi\n' +
    `${E}[33m╭➤${E}[0m ${E}[1m${botName}${E}[0m\n` +
    `${E}[33m┊${E}[0m - ;help ${E}[31m<commande>${E}[0m\n` +
    `${E}[33m┊${E}[0m ${E}[31m<>${E}[0m・Obligatoire\n` +
    `${E}[33m┊${E}[0m ${E}[32m[]${E}[0m・Optionnel\n` +
    `${E}[33m┊${E}[0m ${E}[36m()${E}[0m・Spécification\n` +
    `${E}[33m┊${E}[0m ${E}[35m/ ${E}[0m・Sépare syntaxes\n` +
    '```';

  // Stats
  const statsBlock =
    '```\n' +
    `Nombre de commandes: ${totalCmds}\n` +
    `Commandes custom: ${customCnt}\n` +
    '```';

  const embed = new EmbedBuilder()
    .setColor(COLORS.accent)
    .setTitle('Information')
    .setDescription('```ini\n► Version ' + version + '\n```')
    .addFields(
      { name: 'Catégories', value: categoriesCol, inline: true  },
      { name: 'Syntaxes',   value: syntaxesCol,   inline: true  },
      { name: '​',     value: statsBlock,     inline: false },
    )
    .setFooter({ text: `Page ${page}/${totalPages}` });

  if (botAvatarURL) embed.setThumbnail(botAvatarURL);

  // Dropdown catégories
  const dropdown = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('h:c')
      .setPlaceholder('Catégories')
      .addOptions(
        catNames.slice(0, 25).map(cat => ({
          label      : cat,
          value      : cat,
          description: `${categories[cat].length} commande${categories[cat].length > 1 ? 's' : ''}`,
          emoji      : getCategoryEmojiObject(cat),
        })),
      ),
  );

  // Boutons navigation — toujours présents, désactivés aux limites
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('h:h:f')
      .setEmoji(forButton('btn_first'))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId(`h:h:p:${page}`)
      .setEmoji(forButton('btn_prev'))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId(`h:h:n:${page}`)
      .setEmoji(forButton('btn_next'))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages),
    new ButtonBuilder()
      .setCustomId('h:h:l')
      .setEmoji(forButton('btn_last'))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages),
  );

  const components = [dropdown, navRow];
  validateUniqueCustomIds(components);

  return { embeds: [embed], components };
}

// ─── ÉCRAN 2 — Détail catégorie (Components V2) ───────────────────────────────

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

  // En-tête
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

  // Dropdown
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('### 📂 Catégorie'),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('h:c')
        .setPlaceholder(category)
        .addOptions(
          catNames.slice(0, 25).map(cat => ({
            label      : cat,
            value      : cat,
            description: `${categories[cat].length} commande${categories[cat].length > 1 ? 's' : ''}`,
            emoji      : getCategoryEmojiObject(cat),
            default    : cat === category,
          })),
        ),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // Commandes
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

  // Pagination label
  if (totalPages > 1) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`📄 **Page ${page}/${totalPages}**`),
    );
  }

  // Boutons nav catégorie — toujours présents
  const catSlug = category.slice(0, 40);
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`h:cf:${catSlug}`)
        .setEmoji(forButton('btn_first'))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`h:cp:${catSlug}:${page}`)
        .setEmoji(forButton('btn_prev'))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`h:cn:${catSlug}:${page}`)
        .setEmoji(forButton('btn_next'))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages),
      new ButtonBuilder()
        .setCustomId(`h:cl:${catSlug}`)
        .setEmoji(forButton('btn_last'))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // Bas : accueil + recherche
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('h:back')
        .setLabel('Accueil')
        .setEmoji(forButton('btn_home'))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('h:src')
        .setLabel('Rechercher')
        .setEmoji(forButton('btn_search'))
        .setStyle(ButtonStyle.Primary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Router ───────────────────────────────────────────────────────────────────

function renderHelpPanel(category = null, page = 1, botAvatarURL = null) {
  if (!category) return renderHelpHome(page, botAvatarURL);
  return renderHelpCategory(category, page);
}

module.exports = {
  renderHelpPanel,
  renderHelpHome,
  renderHelpCategory,
  CATEGORIES_PER_PAGE: CATS_PER_PAGE,
  COMMANDS_PER_PAGE  : CMDS_PER_PAGE,
};
