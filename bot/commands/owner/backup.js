'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const E = require('../../utils/embeds');
const { withLoading } = require('../../core/loading');
const {
  serializeGuild, saveTemplate, listTemplates,
  loadTemplate, deleteTemplate, logAction, sanitizeName,
} = require('../../core/template-helper');

module.exports = {
  name       : 'backup',
  aliases    : ['bk'],
  description: 'Sauvegarde ou restaure la structure complète d\'un serveur Discord.',
  usage      : ';backup <create|list|info|restore|delete> [nom]',
  ownerOnly  : true,
  guildOnly  : true,

  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'create' || sub === 'save')              return handleCreate(message, args);
    if (sub === 'list'   || sub === 'ls')                return handleList(message);
    if (sub === 'info')                                  return handleInfo(message, args);
    if (sub === 'restore'|| sub === 'load')              return handleRestore(message, args);
    if (sub === 'delete' || sub === 'del' || sub === 'rm') return handleDelete(message, args);
    return handleHelp(message);
  },
};

// ─── Help ─────────────────────────────────────────────────────────────────────

function handleHelp(message) {
  return message.reply({
    embeds: [E.info('Backup — aide',
      '**Sous-commandes :**\n' +
      '`;backup create <nom>` — Sauvegarde la structure de ce serveur\n' +
      '`;backup list` — Liste les backups disponibles\n' +
      '`;backup info <nom>` — Détails d\'un backup\n' +
      '`;backup restore <nom>` — Restaure un backup sur ce serveur\n' +
      '`;backup delete <nom>` — Supprime un backup\n\n' +
      '**Flags (restore) :**\n' +
      '`--reset` — Supprime tout avant restauration ⚠️\n' +
      '`--emojis` — Inclut les emojis custom')],
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

async function handleCreate(message, args) {
  const name = args[1];
  if (!name) return message.reply({ embeds: [E.error('Nom manquant', 'Usage : `;backup create <nom>`')] });
  if (name.length > 50) return message.reply({ embeds: [E.error('Nom trop long', 'Maximum 50 caractères.')] });

  const includeEmojis = args.includes('--emojis');

  try {
    const { loadingMsg, result } = await withLoading(message, 'Sauvegarde en cours...', async () => {
      const data        = await serializeGuild(message.guild, { includeEmojis });
      const { safeName } = saveTemplate(name, data);
      const totalCh     = data.categories.reduce((s, c) => s + (c.channels?.length || 0), 0);
      logAction({
        action: 'save', templateName: safeName,
        userId: message.author.id, guildId: message.guild.id, guildName: message.guild.name,
        stats : { roles: data.roles.length, categories: data.categories.length, channels: totalCh, emojis: data.emojis.length },
        success: true,
      });
      return { safeName, data, totalCh };
    });
    const { safeName, data, totalCh } = result;
    return loadingMsg.edit({
      embeds: [
        E.success('Backup créé')
          .addFields(
            { name: 'Nom',        value: `\`${safeName}\``,              inline: true },
            { name: 'Rôles',      value: String(data.roles.length),      inline: true },
            { name: 'Catégories', value: String(data.categories.length), inline: true },
            { name: 'Salons',     value: String(totalCh),                inline: true },
            { name: 'Emojis',     value: String(data.emojis.length),     inline: true },
          )],
    });
  } catch { /* withLoading a déjà édité le message d'erreur */ }
}

// ─── List ─────────────────────────────────────────────────────────────────────

async function handleList(message) {
  const templates = listTemplates();
  if (!templates.length) return message.reply({ embeds: [E.info('Backups', 'Aucun backup sauvegardé.')] });

  const lines = templates.map(t =>
    t.error
      ? `**\`${t.name}\`** — ⚠️ ${t.error}`
      : `**\`${t.name}\`** — ${t.stats.categories} cat · ${t.stats.channels} salons · ${t.stats.roles} rôles · ${t.size_kb} Ko`
  );

  return message.reply({ embeds: [E.info(`Backups disponibles (${templates.length})`, lines.join('\n'))] });
}

// ─── Info ─────────────────────────────────────────────────────────────────────

async function handleInfo(message, args) {
  const name = args[1];
  if (!name) return message.reply({ embeds: [E.error('Nom manquant', 'Usage : `;backup info <nom>`')] });

  const template = loadTemplate(name);
  if (!template) return message.reply({ embeds: [E.error('Introuvable', `Le backup \`${name}\` n'existe pas.`)] });

  const totalCh = template.categories?.reduce((s, c) => s + (c.channels?.length || 0), 0) || 0;
  const date    = template.saved_at ? new Date(template.saved_at).toLocaleString('fr-FR') : 'Inconnue';
  const preview = (template.categories || []).slice(0, 5).map(c => `• ${c.name} (${c.channels?.length || 0} salons)`).join('\n');

  return message.reply({
    embeds: [E.info(`Backup : ${sanitizeName(name)}`,
      `**Serveur source :** ${template.name || '—'}\n` +
      `**Sauvegardé le :** ${date}\n\n` +
      `**Rôles :** ${template.roles?.length || 0}\n` +
      `**Catégories :** ${template.categories?.length || 0}\n` +
      `**Salons :** ${totalCh}\n` +
      `**Emojis :** ${template.emojis?.length || 0}\n\n` +
      `**Aperçu catégories :**\n${preview || '—'}\n` +
      (template.categories?.length > 5 ? `*… et ${template.categories.length - 5} de plus*\n` : '') +
      `\nPour restaurer : \`;backup restore ${sanitizeName(name)}\``)],
  });
}

// ─── Restore ──────────────────────────────────────────────────────────────────
// Réutilise le handler tpl_confirm de ready.js (même stockage template-helper).

async function handleRestore(message, args) {
  const name = args[1];
  if (!name) return message.reply({ embeds: [E.error('Nom manquant', 'Usage : `;backup restore <nom>`')] });

  const template = loadTemplate(name);
  if (!template) return message.reply({ embeds: [E.error('Introuvable', `Le backup \`${name}\` n'existe pas. Vérifie \`;backup list\`.`)] });

  const reset         = args.includes('--reset');
  const includeEmojis = args.includes('--emojis');
  const safeName      = sanitizeName(name);
  const totalCh       = template.categories?.reduce((s, c) => s + (c.channels?.length || 0), 0) || 0;
  const estSecs       = Math.ceil((totalCh + (template.roles?.length || 0)) * 0.5);

  const confirmId = `tpl_confirm:${safeName}:${reset ? 'reset' : 'add'}:${includeEmojis ? 'emj' : 'noemj'}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel(reset ? '⚠️ CONFIRMER — tout supprimer puis créer' : '✓ Confirmer la restauration')
      .setStyle(reset ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('tpl_cancel')
      .setLabel('✗ Annuler')
      .setStyle(ButtonStyle.Secondary)
  );

  const lines = [
    `**Backup :** \`${safeName}\``,
    `**Mode :** ${reset ? '🔴 RESET — supprime tout avant restauration' : '🟢 ADD — ajoute sans supprimer'}`,
    `**Emojis :** ${includeEmojis ? '✓ Oui' : '✗ Non'}`,
    '',
    '**Va créer :**',
    `• ${template.categories?.length || 0} catégories`,
    `• ${totalCh} salons`,
    `• ${template.roles?.length || 0} rôles`,
    '',
    ...(reset ? ['⚠️ **La structure actuelle sera SUPPRIMÉE avant restauration.**\n'] : []),
    `Durée estimée : ~${estSecs}s`,
  ];

  return message.reply({
    embeds: [E.warning('Confirmation requise', lines.join('\n'))],
    components: [row],
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function handleDelete(message, args) {
  const name = args[1];
  if (!name) return message.reply({ embeds: [E.error('Nom manquant', 'Usage : `;backup delete <nom>`')] });

  const deleted = deleteTemplate(name);
  if (!deleted) return message.reply({ embeds: [E.error('Introuvable', `Le backup \`${name}\` n'existe pas.`)] });

  logAction({
    action: 'delete', templateName: sanitizeName(name),
    userId: message.author.id, guildId: message.guild.id, guildName: message.guild.name,
    success: true,
  });

  return message.reply({ embeds: [E.success('Backup supprimé', `\`${sanitizeName(name)}\` a été supprimé.`)] });
}
