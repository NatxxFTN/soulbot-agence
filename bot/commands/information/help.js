'use strict';

// Référence pixel-perfect : image/image.png — DraftBot Premium Orange
// Structure validée sur 8 captures : overview + pages catégorie

const {
  ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType,
} = require('discord.js');
const E = require('../../utils/embeds');
const { version } = require('../../../package.json');

// ─── Catalogue catégories — clés = noms de dossiers réels ───────────────────
const CATEGORIES = {
  owner        : { label: 'Owner',        icon: '👑' },
  moderation   : { label: 'Modération',   icon: '🛡️' },
  information  : { label: 'Information',  icon: '📢' },
  utility      : { label: 'Utile',        icon: '🔧' },
  configuration: { label: 'Configuration',icon: '⚙️' },
  protection   : { label: 'Protection',   icon: '🔒' },
  fun          : { label: 'Fun',          icon: '🎮' },
  stats        : { label: 'Statistique',  icon: '📊' },
  ticket       : { label: 'Ticket',       icon: '🎫' },
  game         : { label: 'Game',         icon: '🕹️' },
  custom       : { label: 'Custom',       icon: '🔵' },
  giveaway     : { label: 'Giveaway',     icon: '🎁' },
  greeting     : { label: 'Greeting',     icon: '👋' },
  invitation   : { label: 'Invitation',   icon: '📨' },
  level        : { label: 'Niveau',       icon: '⬆️' },
  role         : { label: 'Rôle',         icon: '🎭' },
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

      const cat = CATEGORIES[cmd.category] ?? { label: cmd.category ?? 'Misc', icon: '📁' };

      return message.channel.send({
        embeds: [
          E.base()
            .setTitle(`${cat.icon}  Commande : \`${cmd.name}\``)
            .addFields(
              { name: '📝 Description', value: cmd.description || '*Aucune description.*', inline: false },
              { name: '📌 Usage',       value: `\`${cmd.usage || `;${cmd.name}`}\``,       inline: true  },
              { name: '📂 Catégorie',   value: `${cat.icon} ${cat.label}`,                 inline: true  },
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

    const userId = message.author.id;
    const pages  = buildPages(categories, client, version);
    let   page   = 0;

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
      if      (action === 'first') page = 0;
      else if (action === 'prev')  page = Math.max(0, page - 1);
      else if (action === 'next')  page = Math.min(pages.length - 1, page + 1);
      else if (action === 'last')  page = pages.length - 1;

      const payload = {
        embeds    : [pages[page]],
        components: [buildRow(page, pages.length, userId)],
      };

      if (interaction.deferred) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.update(payload).catch(() => {});
      }
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

  const catLines = [
    ...visible.map(([cat]) => {
      const c = CATEGORIES[cat] ?? { label: cat };
      return c.label;
    }),
    ...(hidden > 0 ? [`+${hidden} catégories`] : []),
  ].join('\n');

  const syntaxLines = [
    `➤ | ${client.user.username}`,
    ` - ;help <commande>`,
    `<> · Obligatoire`,
    `[] · Optionnel`,
    `() · Spécification`,
    `/  · Sépare syntaxes`,
  ].join('\n');

  const statsLines = [
    `Nombre de commandes: ${client.commands.size}`,
    `Commandes custom: 0`,
  ].join('\n');

  // Catégorie suivante pour le footer
  const firstCat  = categories[0];
  const firstMeta = firstCat ? (CATEGORIES[firstCat[0]] ?? { label: firstCat[0], icon: '📁' }) : null;
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
        value : `\`\`\`\n${catLines}\n\`\`\``,
        inline: true,
      },
      {
        name  : 'Syntaxes',
        value : `\`\`\`\n${syntaxLines}\n\`\`\``,
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
    const meta          = CATEGORIES[cat] ?? { label: cat, icon: '📁' };
    const nextEntry     = categories[i + 1];
    const nextMeta      = nextEntry ? (CATEGORIES[nextEntry[0]] ?? { label: nextEntry[0], icon: '📁' }) : null;

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

function buildRow(page, total, userId) {
  const isFirst = page === 0;
  const isLast  = page === total - 1;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help:first:${userId}`)
      .setEmoji('⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFirst),

    new ButtonBuilder()
      .setCustomId(`help:prev:${userId}`)
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isFirst),

    new ButtonBuilder()
      .setCustomId(`help:next:${userId}`)
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isLast),

    new ButtonBuilder()
      .setCustomId(`help:last:${userId}`)
      .setEmoji('⏩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isLast),
  );
}
