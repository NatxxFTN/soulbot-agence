'use strict';

// Référence pixel-perfect : image/image.png — DraftBot Premium Orange
// Structure validée sur 8 captures : overview + pages catégorie

const {
  ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType,
} = require('discord.js');
const E = require('../../utils/embeds');
const { version } = require('../../../package.json');
const { e } = require('../../core/emojis');

// ─── Catalogue catégories — clés = noms de dossiers réels ───────────────────
const CATEGORIES = {
  owner        : { label: 'Owner',        icon: e('cat_owner') },
  moderation   : { label: 'Modération',   icon: e('cat_moderation') },
  information  : { label: 'Information',  icon: e('cat_information') },
  utility      : { label: 'Utile',        icon: e('cat_utility') },
  configuration: { label: 'Configuration',icon: e('cat_configuration') },
  protection   : { label: 'Protection',   icon: e('cat_protection') },
  fun          : { label: 'Fun',          icon: e('cat_fun') },
  stats        : { label: 'Statistique',  icon: e('cat_information') },
  ticket       : { label: 'Ticket',       icon: e('cat_ticket') },
  game         : { label: 'Game',         icon: e('cat_fun') },
  custom       : { label: 'Custom',       icon: e('cat_configuration') },
  giveaway     : { label: 'Giveaway',     icon: e('cat_giveaway') },
  greeting     : { label: 'Greeting',     icon: e('cat_greeting') },
  invitation   : { label: 'Invitation',   icon: e('cat_information') },
  level        : { label: 'Niveau',       icon: e('cat_level') },
  role         : { label: 'Rôle',         icon: e('cat_configuration') },
};

const CATEGORY_ORDER = [
  'owner','moderation','information','utility','configuration','protection',
  'fun','stats','ticket','game','custom','giveaway','greeting','invitation',
  'level','role',
];

const MAX_DESC_CHARS = 3800;
const TIMEOUT        = 90_000;

module.exports = {
  name       : 'help',
  aliases    : ['aide', 'h'],
  description: 'Liste toutes les commandes avec navigation par catégorie.',
  usage      : ';help [commande]',
  cooldown   : 5,

  guildOnly  : true,

  async execute(message, args, client) {

    // ── Mode détail : ;help <commande> ────────────────────────────────────
    if (args[0]) {
      const input    = args[0].toLowerCase();
      const resolved = client.aliases.get(input) ?? input;
      const cmd      = client.commands.get(resolved);

      if (!cmd) {
        return message.reply({
          embeds: [E.error('Commande introuvable', `\`${input}\` est inconnue. Tape \`;help\` pour la liste.`)],
        });
      }

      const cat = CATEGORIES[cmd.category] ?? { label: cmd.category ?? 'Misc', icon: e('ui_folder') };

      return message.channel.send({
        embeds: [
          E.base()
            .setTitle(`${cat.icon}  Commande : \`${cmd.name}\``)
            .addFields(
              { name: '📝 Description', value: cmd.description || '*Aucune description.*', inline: false },
              { name: `${e('ui_pin')} Usage`,       value: `\`${cmd.usage || `;${cmd.name}`}\``,       inline: true  },
              { name: `${e('ui_folder')} Catégorie`,   value: `${cat.icon} ${cat.label}`,                 inline: true  },
              { name: '⏱️ Cooldown',    value: cmd.cooldown ? `${cmd.cooldown}s` : 'Aucun', inline: true  },
              {
                name : '🔀 Alias',
                value: cmd.aliases?.length
                  ? cmd.aliases.map(a => `\`${a}\``).join('  ')
                  : '*Aucun*',
                inline: false,
              },
            )
            .setFooter({ text: ';help pour revenir à la liste complète' }),
        ],
      });
    }

    // ── Grouper + trier ───────────────────────────────────────────────────
    const grouped = new Map();
    for (const cmd of client.commands.values()) {
      const cat = cmd.category ?? 'misc';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push(cmd);
    }

    // Trier selon CATEGORY_ORDER, catégories inconnues à la fin
    const categories = [...grouped.entries()].sort(([a], [b]) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return  1;
      return a.localeCompare(b);
    });

    const userId  = message.author.id;
    const pages   = buildPages(categories, client, version);
    // null = overview, string = clé catégorie — 1 entrée par page
    const pageMap = [null, ...categories.map(([cat]) => cat)];
    let   page    = 0;

    const sent = await message.channel.send({
      embeds    : [pages[page]],
      components: [buildRow(page, pages.length, userId)],
    });

    const collector = sent.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.customId.endsWith(`:${userId}`) && i.user.id === userId,
      time  : TIMEOUT,
    });

    collector.on('collect', async interaction => {
      const action = interaction.customId.split(':')[1];
      const total  = pages.length;
      if      (action === 'cat_prev')  page = catPrev(page, pageMap);
      else if (action === 'page_prev') page = Math.max(0, page - 1);
      else if (action === 'page_next') page = Math.min(total - 1, page + 1);
      else if (action === 'cat_next')  page = catNext(page, pageMap, total);

      await interaction.deferUpdate().catch(() => {});
      await sent.edit({
        embeds    : [pages[page]],
        components: [buildRow(page, pages.length, userId)],
      }).catch(e => console.error('[help] edit:', e.message));
    });

    collector.on('end', () => sent.edit({ components: [] }).catch(() => {}));
  },
};

// ─── Page builders ───────────────────────────────────────────────────────────

function buildPages(categories, client, ver) {
  const pages = [];
  const total = categories.length + 1;

  // ── Page 0 : Overview ─────────────────────────────────────────────────
  const MAX_VISIBLE = 10;
  const visible     = categories.slice(0, MAX_VISIBLE);
  const hidden      = categories.length - visible.length;

  const CAT_COLORS = {
    owner        : '\u001b[33m',  // jaune
    moderation   : '\u001b[31m',  // rouge
    information  : '\u001b[36m',  // cyan
    utility      : '\u001b[32m',  // vert
    configuration: '\u001b[34m',  // bleu
    protection   : '\u001b[35m',  // magenta
    fun          : '\u001b[35m',  // magenta
    stats        : '\u001b[37m',  // blanc
    ticket       : '\u001b[36m',  // cyan
    game         : '\u001b[32m',  // vert
    custom       : '\u001b[34m',  // bleu
    giveaway     : '\u001b[33m',  // jaune
    greeting     : '\u001b[31m',  // rouge
    invitation   : '\u001b[35m',  // magenta
    level        : '\u001b[32m',  // vert
    role         : '\u001b[36m',  // cyan
  };

  const allCats   = CATEGORY_ORDER.slice(0, MAX_VISIBLE);
  const hiddenCnt = CATEGORY_ORDER.length - allCats.length;

  const catLines = [
    ...allCats.map(cat => {
      const c   = CATEGORIES[cat] ?? { label: cat };
      const col = CAT_COLORS[cat] ?? '\u001b[37m';
      return `${col}${c.label}\u001b[0m`;
    }),
    ...(hiddenCnt > 0 ? [`\u001b[90m+${hiddenCnt} catégories\u001b[0m`] : []),
  ].join('\n');

  const O = '\u001b[33m'; // orange/jaune
  const R = '\u001b[31m'; // rouge
  const G = '\u001b[32m'; // vert
  const C = '\u001b[36m'; // cyan
  const M = '\u001b[35m'; // magenta
  const W = '\u001b[1m';  // gras
  const X = '\u001b[0m';  // reset

  const syntaxLines = [
    `${O}╭➤│${W}${client.user.username}${X}`,
    `${O}┊${X} - ;help ${R}<commande>${X}`,
    `${O}┊${X} ${R}<>${X}・Obligatoire`,
    `${O}┊${X} ${G}[]${X}・Optionnel`,
    `${O}┊${X} ${C}()${X}・Spécification`,
    `${O}┊${X} ${M}/ ${X}・Sépare syntaxes`,
  ].join('\n');

  // Catégorie suivante pour le footer
  const firstCat  = categories[0];
  const firstMeta = firstCat ? (CATEGORIES[firstCat[0]] ?? { label: firstCat[0], icon: e('ui_folder') }) : null;
  const firstFooter = firstMeta ? `| ${firstMeta.icon} ${firstMeta.label}` : '';

  const overview = E.base()
    .setTimestamp(null)
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL({ size: 64 }) })
    .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
    .setTitle('Information')
    .addFields(
      {
        name  : '\u200B',
        value : `\`\`\`\n► Version ${ver}\n\`\`\``,
        inline: false,
      },
      {
        name  : 'Catégories',
        value : `\`\`\`ansi\n${catLines}\n\`\`\``,
        inline: true,
      },
      {
        name  : 'Syntaxes',
        value : `\`\`\`ansi\n${syntaxLines}\n\`\`\``,
        inline: true,
      },
      {
        name  : '\u200B',
        value : `\`\`\`\nNombre de commandes: ${client.commands.size}\nCommandes custom: 0\n\`\`\``,
        inline: false,
      },
    )
    .setFooter({ text: `Page 1/${total} ${firstFooter}` });

  pages.push(overview);

  // ── Pages 1..N : une par catégorie ───────────────────────────────────
  for (let i = 0; i < categories.length; i++) {
    const [cat, cmds]   = categories[i];
    const meta          = CATEGORIES[cat] ?? { label: cat, icon: e('ui_folder') };
    const nextEntry     = categories[i + 1];
    const nextMeta      = nextEntry ? (CATEGORIES[nextEntry[0]] ?? { label: nextEntry[0], icon: e('ui_folder') }) : null;

    const sorted = [...cmds].sort((a, b) => a.name.localeCompare(b.name));

    // Format 2 lignes : "name [usage_args]\nDescription"
    const lines = [];
    for (const c of sorted) {
      const usageArgs = c.usage
        ? c.usage.replace(/^;?\S+\s*/, '').trim()
        : '';
      const nameLine = usageArgs ? `${c.name} ${usageArgs}` : c.name;
      lines.push(`**${nameLine}**\n${c.description || 'Aucune description.'}`);
    }

    // Tronquer si dépassement (embed description max 4096)
    let desc = '';
    for (const line of lines) {
      const candidate = desc ? `${desc}\n\n${line}` : line;
      if (candidate.length > MAX_DESC_CHARS) {
        desc += '\n\n*… et d\'autres commandes. Tape `;help <commande>` pour le détail.*';
        break;
      }
      desc = candidate;
    }

    const footerNext  = nextMeta ? `| ${nextMeta.label} ${nextMeta.icon}` : '';
    const footerText  = `Page ${i + 2}/${total} | ${meta.icon} ${meta.label} ${footerNext}`;

    const embed = E.base()
      .setTimestamp(null)
      .setTitle(`Help » ${meta.label}`)
      .setDescription(desc || '*Aucune commande dans cette catégorie.*')
      .setFooter({ text: footerText });

    pages.push(embed);
  }

  return pages;
}

// ─── Navigation catégorie ────────────────────────────────────────────────────
// pageMap[i] = clé catégorie (string) ou null pour l'overview
// Fonctionne pour N pages par catégorie — futur-proof

function catNext(page, pageMap, total) {
  if (page >= total - 1) return total - 1;
  const current = pageMap[page];
  for (let i = page + 1; i < total; i++) {
    if (pageMap[i] !== current) return i;
  }
  return total - 1;
}

function catPrev(page, pageMap) {
  if (page <= 0) return 0;
  const current = pageMap[page];
  // Reculer jusqu'à changer de catégorie
  let i = page - 1;
  while (i > 0 && pageMap[i] === current) i--;
  if (pageMap[i] === current) return 0;
  // Trouver la 1ère page de cette catégorie précédente
  const prev = pageMap[i];
  while (i > 0 && pageMap[i - 1] === prev) i--;
  return i;
}

function buildRow(page, total, userId) {
  const isFirst = page === 0;
  const isLast  = page === total - 1;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help:cat_prev:${userId}`)
      .setEmoji('⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFirst),

    new ButtonBuilder()
      .setCustomId(`help:page_prev:${userId}`)
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isFirst),

    new ButtonBuilder()
      .setCustomId(`help:page_next:${userId}`)
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isLast),

    new ButtonBuilder()
      .setCustomId(`help:cat_next:${userId}`)
      .setEmoji('⏩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isLast),
  );
}
