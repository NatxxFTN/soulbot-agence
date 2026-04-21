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

const CATEGORY_ANSI = {
  'Owner':         33,
  'Moderation':    31,
  'Modération':    31,
  'Information':   36,
  'Info':          36,
  'Utility':       32,
  'Utile':         32,
  'Configuration': 34,
  'Config':        34,
  'Protection':    35,
  'Fun':           35,
  'Stats':         37,
  'Statistique':   37,
  'Statistiques':  37,
  'Ticket':        36,
  'Game':          32,
  'Games':         32,
  'Giveaway':      33,
  'Greeting':      33,
  'Level':         34,
  'Niveau':        34,
  'Niveaux':       34,
  'Economy':       32,
  'Économie':      32,
  'Custom':        35,
  'Role':          33,
  'Roles':         33,
  'Rôle':          33,
  'Invitation':    36,
  'Logs':          37,
  'Welcomer':      33,
  'Automod':       31,
};

function getAnsiColor(cat) {
  return CATEGORY_ANSI[cat] ?? 37;
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

  const A = '';

  // ── Colonne gauche : catégories en ANSI ───────────────────────────────────
  const catsLines = pageCats.map(cat => `${A}[${getAnsiColor(cat)}m${cat}${A}[0m`);
  if (catNames.length > CATS_PER_PAGE) {
    catsLines.push(`${A}[90m+${catNames.length - CATS_PER_PAGE} catégories${A}[0m`);
  }
  const categoriesCol = '```ansi\n' + catsLines.join('\n') + '\n```';

  // ── Colonne droite : syntaxes ANSI format Samy ────────────────────────────
  const syntaxesCol =
    '```ansi\n' +
    `${A}[33m╭➤${A}[0m ${A}[1m${botName}${A}[0m\n` +
    `${A}[33m┊${A}[0m - ;help ${A}[31m<commande>${A}[0m\n` +
    `${A}[33m┊${A}[0m ${A}[31m<>${A}[0m・Obligatoire\n` +
    `${A}[33m┊${A}[0m ${A}[32m[]${A}[0m・Optionnel\n` +
    `${A}[33m┊${A}[0m ${A}[36m()${A}[0m・Spécification\n` +
    `${A}[33m┊${A}[0m ${A}[35m/ ${A}[0m・Sépare syntaxes\n` +
    '```';

  // ── Stats (inline:false — sous les 2 colonnes) ────────────────────────────
  const statsBlock =
    '```\n' +
    `Nombre de commandes: ${totalCmds}\n` +
    `Commandes custom: ${customCnt}\n` +
    '```';

  // ── Embed ─────────────────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(COLORS.accent)
    .setTitle('Information')
    .setDescription('```ini\n► Version ' + version + '\n```')
    .addFields(
      { name: 'Catégories', value: categoriesCol, inline: true  },
      { name: 'Syntaxes',   value: syntaxesCol,   inline: true  },
      { name: '​',     value: statsBlock,     inline: false },
    )
    .setFooter({ text: `Page ${page}/${totalPages}  ·  ${getCategoryEmoji(activeCat)} ${activeCat}` });

  if (botAvatarURL) embed.setThumbnail(botAvatarURL);

  // ── Dropdown ──────────────────────────────────────────────────────────────
  const dropdown = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help:category')
      .setPlaceholder('📂 Catégories')
      .addOptions(
        catNames.slice(0, 25).map(cat => ({
          label      : cat,
          value      : cat,
          description: `${categories[cat].length} commande${categories[cat].length > 1 ? 's' : ''}`,
          emoji      : getCategoryEmoji(cat),
        })),
      ),
  );

  const components = [dropdown];

  // ── Pagination — toujours visible, grisé si 1 page ──────────────────────
  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help:nav:home:first')
        .setEmoji('⏮')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`help:nav:home:prev:${page}`)
        .setEmoji('◀')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`help:nav:home:next:${page}`)
        .setEmoji('▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages),
      new ButtonBuilder()
        .setCustomId('help:nav:home:last')
        .setEmoji('⏭')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages),
    ),
  );

  return { embeds: [embed], components };
}

// ─── ÉCRAN 2 — Détails catégorie (Components V2) ──────────────────────────────

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

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help:category')
        .setPlaceholder(`${getCategoryEmoji(category)} ${category}`)
        .addOptions(
          catNames.slice(0, 25).map(cat => ({
            label      : cat,
            value      : cat,
            description: `${categories[cat].length} commande${categories[cat].length > 1 ? 's' : ''}`,
            emoji      : getCategoryEmoji(cat),
            default    : cat === category,
          })),
        ),
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

  // ── Pagination — toujours visible, grisé si 1 page ──────────────────────
  if (totalPages > 1) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`📄 **Page ${page}/${totalPages}**`),
    );
  }
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`help:nav:category:first:${category}`)
        .setEmoji('⏮')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`help:nav:category:prev:${category}:${page}`)
        .setEmoji('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`help:nav:category:next:${category}:${page}`)
        .setEmoji('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages),
      new ButtonBuilder()
        .setCustomId(`help:nav:category:last:${category}`)
        .setEmoji('⏭')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages),
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Bas : Accueil + Rechercher ────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help:back_home')
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

function renderHelpPanel(category = null, page = 1, botAvatarURL = null) {
  if (!category) return renderHelpHome(page, botAvatarURL);
  return renderHelpCategory(category, page);
}

module.exports = { renderHelpPanel, renderHelpHome, renderHelpCategory };
