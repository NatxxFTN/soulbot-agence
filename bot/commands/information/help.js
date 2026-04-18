'use strict';

// Référence pixel-perfect : image/image.png (DraftBot Premium Orange)
// Structure : setAuthor bot · setThumbnail · Version · [Catégories | Syntaxes] · Stats · Pagination emoji

const {
  ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType,
} = require('discord.js');
const E = require('../../utils/embeds');
const { version } = require('../../../package.json');

// ─── ANSI color codes (blocs ```ansi``` Discord uniquement) ──────────────────
const A = {
  RESET  : '\u001b[0m',
  BOLD   : '\u001b[1m',
  CYAN   : '\u001b[36m',    // catégories — reproduit le cyan de l'image de référence
  YELLOW : '\u001b[33m',    // owner + accents syntaxe
  GREEN  : '\u001b[32m',    // catégories positives (niveaux)
  GRAY   : '\u001b[2;37m',  // séparateurs
  WHITE  : '\u001b[37m',
};

// ─── Catalogue catégories ────────────────────────────────────────────────────
const CATEGORIES = {
  owner      : { label: 'Owner',         icon: '👑', ansi: A.YELLOW },
  moderation : { label: 'Modération',    icon: '🛡️', ansi: A.CYAN   },
  public     : { label: 'Information',   icon: '📢', ansi: A.CYAN   },
  utility    : { label: 'Utile',         icon: '🔧', ansi: A.CYAN   },
  gestion    : { label: 'Configuration', icon: '⚙️', ansi: A.CYAN   },
  levels     : { label: 'Niveaux',       icon: '⬆️', ansi: A.GREEN  },
  fun        : { label: 'Fun',           icon: '🎮', ansi: A.CYAN   },
  stats      : { label: 'Statistique',   icon: '📊', ansi: A.CYAN   },
  invitations: { label: 'Invitations',   icon: '📨', ansi: A.CYAN   },
};

const CATEGORY_ORDER = [
  'owner','moderation','public','utility','gestion','levels','fun','stats','invitations',
];

const TIMEOUT = 90_000;

// ─── Module ──────────────────────────────────────────────────────────────────

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
              { name: '📌 Usage',       value: `\`${cmd.usage  || `;${cmd.name}`}\``,      inline: true  },
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
            .setTimestamp()
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

    const categories = [...grouped.entries()].sort(([a], [b]) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return  1;
      return a.localeCompare(b);
    });

    const userId = message.author.id;
    const pages  = buildPages(categories, client);
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

      // POURQUOI editReply : interactionCreate.js a appelé deferUpdate() avant
      // que le collector reçoive l'interaction — update() échouerait.
      if (interaction.deferred) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.update(payload).catch(() => {});
      }
    });

    // Retire les boutons quand la session expire (évite "This interaction failed")
    collector.on('end', () => sent.edit({ components: [] }).catch(() => {}));
  },
};

// ─── Page builders ───────────────────────────────────────────────────────────

function buildPages(categories, client) {
  const pages = [];
  const total = categories.length + 1;

  // ── Page 0 : Overview pixel-perfect ───────────────────────────────────
  //
  // Layout exact de l'image de référence :
  //   [Author : nom + avatar]
  //   [Thumbnail : avatar bot (carré, haut-droite)]
  //   Title : "Information"
  //   [Field pleine largeur : ► Version X.X.X]
  //   [Field inline gauche : Catégories (ANSI cyan)]  [Field inline droite : Syntaxes (codeblock)]
  //   [Field pleine largeur : stats commandes]
  //   Footer : Page 1/N
  //   Timestamp

  // ── Catégories : Nom  (count) ─────────────────────────────────────────
  const MAX_VISIBLE = 10;
  const visibleCats = categories.slice(0, MAX_VISIBLE);
  const hiddenCount = categories.length - visibleCats.length;
  const catLines = [
    ...visibleCats.map(([cat, cmds]) => {
      const c = CATEGORIES[cat] ?? { label: cat };
      return `${c.label}  (${cmds.length})`;
    }),
    ...(hiddenCount > 0 ? [`+${hiddenCount} catégories`] : []),
  ].join('\n');

  // ── Syntaxes : style ╭➤￤ + ┊ ─────────────────────────────────────────
  const botName = client.user.username;
  const syntaxLines = [
    `╭➤￤${botName}`,
    `┊ - ;help <commande>`,
    `┊ <>・Obligatoire`,
    `┊ []・Optionnel`,
    `┊ ()・Spécification`,
    `┊ /  ・Sépare syntaxes`,
  ].join('\n');

  // ── Stats (pleine largeur) ────────────────────────────────────────────
  const statsLines = [
    `Nombre de commandes: ${client.commands.size}`,
    `Commandes custom: 0`,
  ].join('\n');

  const overview = E.base()
    .setTimestamp(null)
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL({ size: 64 }) })
    .setTitle('Information')
    .addFields(
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
        value : `\`\`\`\n${statsLines}\n\`\`\``,
        inline: false,
      },
    )
    .setFooter({ text: `Page 1/${total} · ;help <commande>` });

  pages.push(overview);

  // ── Pages 1..N : une par catégorie ───────────────────────────────────
  for (let i = 0; i < categories.length; i++) {
    const [cat, cmds] = categories[i];
    const meta  = CATEGORIES[cat] ?? { label: cat, icon: '📁' };

    const cmdLines = [...cmds]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => `\`${c.name}\` — ${c.description || '*Aucune description.*'}`)
      .join('\n');

    const embed = E.base()
      .setTimestamp(null)
      .setTitle(`${meta.icon}  ${meta.label}`)
      .setDescription(cmdLines || '*Aucune commande dans cette catégorie.*')
      .setFooter({ text: `Page ${i + 2}/${total} | ${meta.label} | ;help <commande>` });

    pages.push(embed);
  }

  return pages;
}

/**
 * 4 boutons de navigation avec emojis Unicode (reproduit les flèches de l'image).
 * Premier/Précédent désactivés sur page 0.
 * Suivant/Dernier désactivés sur la dernière page.
 */
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
