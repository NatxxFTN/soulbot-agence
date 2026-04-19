'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const E = require('../../utils/embeds');
const {
  serializeGuild, saveTemplate, listTemplates,
  loadTemplate, deleteTemplate, logAction, sanitizeName,
} = require('../../core/template-helper');

module.exports = {
  name       : 'template',
  aliases    : ['tpl'],
  description: 'Sauvegarde, liste, applique ou supprime un template de structure de serveur.',
  usage      : ';template save <nom> | list | info <nom> | load <nom> [--reset] [--emojis] | delete <nom>',
  cooldown   : 10,
  ownerOnly  : true,
  guildOnly  : true,

  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'save')               return handleSave(message, args);
    if (sub === 'list')               return handleList(message);
    if (sub === 'load')               return handleLoad(message, args);
    if (sub === 'info')               return handleInfo(message, args);
    if (sub === 'delete' || sub === 'del') return handleDelete(message, args);

    return message.reply({
      embeds: [
        E.info('Templates — aide', [
          '**Sous-commandes :**',
          '`;template save <nom>` — Sauvegarde ce serveur',
          '`;template list` — Liste les templates disponibles',
          '`;template info <nom>` — Détails d\'un template',
          '`;template load <nom>` — Applique un template sur ce serveur',
          '`;template delete <nom>` — Supprime un template',
          '',
          '**Flags (load) :**',
          '`--reset` — Supprime tout avant de recréer ⚠️',
          '`--emojis` — Inclut les emojis custom',
        ].join('\n')),
      ],
    });
  },
};

// ─── Save ─────────────────────────────────────────────────────────────────────

async function handleSave(message, args) {
  const name = args[1];
  if (!name) {
    return message.reply({ embeds: [E.error('Nom manquant', 'Usage : `;template save <nom>`')] });
  }
  if (name.length > 50) {
    return message.reply({ embeds: [E.error('Nom trop long', 'Le nom ne peut pas dépasser 50 caractères.')] });
  }

  const includeEmojis = args.includes('--emojis');
  const loading = await message.reply({ embeds: [E.info('Sauvegarde en cours...', 'Analyse de la structure du serveur.')] });

  try {
    const data      = await serializeGuild(message.guild, { includeEmojis });
    const { safeName } = saveTemplate(name, data);
    const totalCh   = data.categories.reduce((s, c) => s + (c.channels?.length || 0), 0);

    logAction({
      action      : 'save',
      templateName: safeName,
      userId      : message.author.id,
      guildId     : message.guild.id,
      guildName   : message.guild.name,
      stats       : { roles: data.roles.length, categories: data.categories.length, channels: totalCh, emojis: data.emojis.length },
      success     : true,
    });

    return loading.edit({
      embeds: [
        E.success('Template sauvegardé')
          .addFields(
            { name: 'Nom',        value: `\`${safeName}\``,         inline: true },
            { name: 'Rôles',      value: String(data.roles.length), inline: true },
            { name: 'Catégories', value: String(data.categories.length), inline: true },
            { name: 'Salons',     value: String(totalCh),           inline: true },
            { name: 'Emojis',     value: String(data.emojis.length), inline: true },
          ),
      ],
    });
  } catch (err) {
    console.error('[template save]', err);
    return loading.edit({ embeds: [E.error('Erreur de sauvegarde', err.message)] });
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

async function handleList(message) {
  const templates = listTemplates();
  if (templates.length === 0) {
    return message.reply({ embeds: [E.info('Templates', 'Aucun template sauvegardé.')] });
  }

  const lines = templates.map(t =>
    t.error
      ? `**\`${t.name}\`** — ⚠️ ${t.error}`
      : `**\`${t.name}\`** — ${t.stats.categories} cat · ${t.stats.channels} salons · ${t.stats.roles} rôles · ${t.size_kb} Ko`
  );

  return message.reply({
    embeds: [E.info(`Templates disponibles (${templates.length})`, lines.join('\n'))],
  });
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function handleLoad(message, args) {
  const name = args[1];
  if (!name) {
    return message.reply({ embeds: [E.error('Nom manquant', 'Usage : `;template load <nom>`')] });
  }

  const template = loadTemplate(name);
  if (!template) {
    return message.reply({ embeds: [E.error('Introuvable', `Le template \`${name}\` n'existe pas. Vérifie \`;template list\`.`)] });
  }

  const reset        = args.includes('--reset');
  const includeEmojis = args.includes('--emojis');
  const safeName     = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 50);
  const totalCh      = template.categories?.reduce((s, c) => s + (c.channels?.length || 0), 0) || 0;
  const estSecs      = Math.ceil((totalCh + (template.roles?.length || 0)) * 0.5);

  // customId : tpl_confirm:<name>:<mode>:<emjflag>
  const confirmId = `tpl_confirm:${safeName}:${reset ? 'reset' : 'add'}:${includeEmojis ? 'emj' : 'noemj'}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel(reset ? '⚠️ CONFIRMER — tout supprimer puis créer' : '✅ Confirmer')
      .setStyle(reset ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('tpl_cancel')
      .setLabel('✗ Annuler')
      .setStyle(ButtonStyle.Secondary)
  );

  const lines = [
    `**Template :** \`${safeName}\``,
    `**Mode :** ${reset ? '🔴 RESET — supprime tout avant création' : '🟢 ADD — ajoute sans supprimer'}`,
    `**Emojis :** ${includeEmojis ? '✅ Oui' : '✗ Non'}`,
    '',
    '**Va créer :**',
    `• ${template.categories?.length || 0} catégories`,
    `• ${totalCh} salons`,
    `• ${template.roles?.length || 0} rôles`,
    '',
    ...(reset ? ['⚠️ **ATTENTION :** Toute la structure actuelle sera **SUPPRIMÉE** avant création. Action **irréversible**.', ''] : []),
    `Durée estimée : ~${estSecs}s`,
  ];

  return message.reply({
    embeds: [E.warning('Confirmation requise', lines.join('\n'))],
    components: [row],
  });
}

// ─── Info ─────────────────────────────────────────────────────────────────────

async function handleInfo(message, args) {
  const name = args[1];
  if (!name) {
    return message.reply({ embeds: [E.error('Nom manquant', 'Usage : `;template info <nom>`')] });
  }

  const template = loadTemplate(name);
  if (!template) {
    return message.reply({ embeds: [E.error('Introuvable', `Le template \`${name}\` n'existe pas.`)] });
  }

  const totalCh  = template.categories?.reduce((s, c) => s + (c.channels?.length || 0), 0) || 0;
  const date     = template.saved_at ? new Date(template.saved_at).toLocaleString('fr-FR') : 'Inconnue';
  const preview  = (template.categories || [])
    .slice(0, 5)
    .map(c => `• ${c.name} (${c.channels?.length || 0} salons)`)
    .join('\n');

  return message.reply({
    embeds: [
      E.info(`Template : ${sanitizeName(name)}`, [
        `**Serveur source :** ${template.name || '—'}`,
        `**Sauvegardé le :** ${date}`,
        '',
        `**Rôles :** ${template.roles?.length || 0}`,
        `**Catégories :** ${template.categories?.length || 0}`,
        `**Salons :** ${totalCh}`,
        `**Emojis :** ${template.emojis?.length || 0}`,
        '',
        '**Aperçu catégories :**',
        preview || '—',
        ...(template.categories?.length > 5 ? [`*… et ${template.categories.length - 5} de plus*`] : []),
        '',
        `Pour appliquer : \`;template load ${sanitizeName(name)}\``,
      ].join('\n')),
    ],
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function handleDelete(message, args) {
  const name = args[1];
  if (!name) {
    return message.reply({ embeds: [E.error('Nom manquant', 'Usage : `;template delete <nom>`')] });
  }

  const deleted = deleteTemplate(name);
  if (!deleted) {
    return message.reply({ embeds: [E.error('Introuvable', `Le template \`${name}\` n'existe pas.`)] });
  }

  logAction({
    action      : 'delete',
    templateName: sanitizeName(name),
    userId      : message.author.id,
    guildId     : message.guild.id,
    guildName   : message.guild.name,
    success     : true,
  });

  return message.reply({ embeds: [E.success('Template supprimé', `\`${sanitizeName(name)}\` a été supprimé.`)] });
}
