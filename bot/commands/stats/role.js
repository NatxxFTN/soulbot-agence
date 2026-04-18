'use strict';

const { EmbedBuilder } = require('discord.js');
const { db, getGuildSettings, setGuildSetting } = require('../../database');
const { parseDays, formatDate } = require('../../utils/format');
const E = require('../../utils/embeds');

/*
 * Commande unifiée ;role pour le module stats :
 *
 *   ;role ancient add @role <jours>   — Ajouter un palier d'ancienneté
 *   ;role ancient del @role           — Supprimer un palier
 *   ;role ancient list                — Lister les paliers
 *   ;role ancient cumul               — Activer/désactiver le mode cumulatif
 *   ;role ancient check               — Vérifier et assigner les rôles manuellement
 *
 *   ;role badge   @role               — Définir le rôle badge
 *   ;role bday    @role               — Définir le rôle anniversaire
 *   ;role boost   @role               — Définir le rôle booster
 *   ;role voc     @role               — Définir le rôle vocal actif
 *
 * Les types level, event, invite seront ajoutés dans leurs modules respectifs.
 */
module.exports = {
  name        : 'role',
  aliases     : [],
  description : 'Gestion des rôles automatiques (ancient, badge, bday, boost, voc).',
  usage       : 'role <ancient|badge|bday|boost|voc> [sous-commande] [arguments]',
  cooldown    : 3,
  permissions : ['ManageRoles'],

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const sub     = (args[0] ?? '').toLowerCase();

    // ── ;role ancient ─────────────────────────────────────────────────────────
    if (sub === 'ancient') {
      return handleAncient(message, args.slice(1), guildId, client);
    }

    // ── ;role badge | bday | boost | voc ─────────────────────────────────────
    const simpleMap = {
      badge : 'role_badge_id',
      bday  : 'role_bday_id',
      boost : 'role_boost_id',
      voc   : 'role_voc_id',
    };

    if (simpleMap[sub]) {
      return handleSimpleRole(message, args.slice(1), guildId, sub, simpleMap[sub]);
    }

    return message.reply({ embeds: [E.usage(';', 'role <ancient|badge|bday|boost|voc> ...', 'Gestion des rôles automatiques.')] });
  },
};

// ─── Handler rôles simples (badge / bday / boost / voc) ───────────────────────
async function handleSimpleRole(message, args, guildId, roleName, dbField) {
  const labels = { badge: 'Badge', bday: 'Anniversaire', boost: 'Booster', voc: 'Vocal' };
  const label  = labels[roleName];

  const action = (args[0] ?? '').toLowerCase();
  const role   = message.mentions.roles.first();

  // Afficher le rôle actuel
  if (!action || action === 'show' || action === 'info') {
    const settings = getGuildSettings(guildId);
    const currentId = settings[dbField];
    const currentRole = currentId ? message.guild.roles.cache.get(currentId) : null;
    return message.reply({
      embeds: [E.info(`Rôle ${label}`, currentRole ? `Rôle actuel : ${currentRole}` : '*Non configuré*')]
    });
  }

  // Définir le rôle
  if (action === 'set' || action === 'add') {
    if (!role) return message.reply({ embeds: [E.error('Usage', `\`;role ${roleName} set @role\``)] });
    setGuildSetting(guildId, dbField, role.id);
    return message.reply({ embeds: [E.success(`Rôle ${label}`, `Rôle ${role} défini comme rôle **${label}**.`)] });
  }

  // Supprimer le rôle
  if (action === 'remove' || action === 'del' || action === 'delete') {
    setGuildSetting(guildId, dbField, null);
    return message.reply({ embeds: [E.success(`Rôle ${label}`, `Le rôle **${label}** a été retiré.`)] });
  }

  // Si un rôle est mentionné directement sans action → définir
  if (role && !action) {
    setGuildSetting(guildId, dbField, role.id);
    return message.reply({ embeds: [E.success(`Rôle ${label}`, `Rôle ${role} défini comme rôle **${label}**.`)] });
  }

  return message.reply({ embeds: [E.usage(';', `role ${roleName} [set|remove] @role`, `Définir le rôle ${label}.`)] });
}

// ─── Handler rôles anciens ─────────────────────────────────────────────────────
async function handleAncient(message, args, guildId, client) {
  const action = (args[0] ?? 'list').toLowerCase();

  // ── list ───────────────────────────────────────────────────────────────────
  if (action === 'list' || action === 'liste') {
    const rules = db.prepare('SELECT * FROM ancient_roles WHERE guild_id = ? ORDER BY days_threshold ASC').all(guildId);

    if (!rules.length) {
      return message.reply({ embeds: [E.info('Rôles Anciens', 'Aucun palier configuré.\nUtilise `;role ancient add @role <jours>` pour en ajouter.')] });
    }

    const isCumul = rules.some(r => r.cumulative);
    const lines   = rules.map(r => {
      const role = message.guild.roles.cache.get(r.role_id);
      return `• ${role ?? `<@&${r.role_id}>`} — **${r.days_threshold} jour(s)**`;
    });

    const embed = new EmbedBuilder()
      .setColor(E.COLORS.PRIMARY)
      .setTitle('👑  Rôles Anciens — Paliers')
      .setDescription(lines.join('\n'))
      .addFields({ name: 'Mode', value: isCumul ? '✅ Cumulatif (garder les anciens rôles)' : '🔄 Non-cumulatif (remplacer)', inline: true })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // ── add @role <jours> ──────────────────────────────────────────────────────
  if (action === 'add' || action === 'ajouter') {
    const role = message.mentions.roles.first();
    const days = parseDays(args.find(a => /^\d+d?$/i.test(a)));

    if (!role || !days) {
      return message.reply({ embeds: [E.usage(';', 'role ancient add @role <jours>', 'Ex: `;role ancient add @Vétéran 30`')] });
    }

    db.prepare(`
      INSERT OR REPLACE INTO ancient_roles (guild_id, role_id, days_threshold)
      VALUES (?, ?, ?)
    `).run(guildId, role.id, days);

    return message.reply({ embeds: [E.success('Palier ajouté', `${role} sera attribué après **${days} jour(s)** de présence.`)] });
  }

  // ── del @role ──────────────────────────────────────────────────────────────
  if (action === 'del' || action === 'delete' || action === 'remove' || action === 'supprimer') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply({ embeds: [E.usage(';', 'role ancient del @role', '')] });

    const existing = db.prepare('SELECT * FROM ancient_roles WHERE guild_id = ? AND role_id = ?').get(guildId, role.id);
    if (!existing) return message.reply({ embeds: [E.error('Introuvable', `Le rôle ${role} n'est pas dans la liste des paliers.`)] });

    db.prepare('DELETE FROM ancient_roles WHERE guild_id = ? AND role_id = ?').run(guildId, role.id);
    return message.reply({ embeds: [E.success('Palier supprimé', `Le palier pour ${role} a été retiré.`)] });
  }

  // ── cumul (toggle) ─────────────────────────────────────────────────────────
  if (action === 'cumul' || action === 'cumulative') {
    const rules = db.prepare('SELECT * FROM ancient_roles WHERE guild_id = ? LIMIT 1').get(guildId);
    if (!rules) return message.reply({ embeds: [E.error('Aucun palier', 'Configure d\'abord des paliers avec `;role ancient add`.')] });

    const currentCumul = rules.cumulative;
    const newCumul     = currentCumul ? 0 : 1;

    db.prepare('UPDATE ancient_roles SET cumulative = ? WHERE guild_id = ?').run(newCumul, guildId);

    return message.reply({ embeds: [E.success('Mode cumulatif', newCumul ? '✅ Activé — les anciens rôles seront conservés.' : '🔄 Désactivé — seul le rôle le plus élevé sera conservé.')] });
  }

  // ── check (assigner manuellement) ─────────────────────────────────────────
  if (action === 'check' || action === 'refresh' || action === 'sync') {
    const processingMsg = await message.reply({ embeds: [E.info('Vérification...', 'Assignation des rôles anciens en cours...')] });

    const rules = db.prepare('SELECT * FROM ancient_roles WHERE guild_id = ? ORDER BY days_threshold ASC').all(guildId);
    if (!rules.length) {
      return processingMsg.edit({ embeds: [E.error('Aucun palier', 'Configure d\'abord des paliers.')] });
    }

    let members;
    try {
      members = await message.guild.members.fetch();
    } catch {
      return processingMsg.edit({ embeds: [E.error('Erreur', 'Impossible de récupérer les membres.')] });
    }

    const now  = Math.floor(Date.now() / 1000);
    let added  = 0;

    for (const member of members.values()) {
      if (member.user.bot) continue;
      const daysSince = Math.floor((now - member.joinedTimestamp / 1000) / 86400);

      for (const rule of rules) {
        const qualifies = daysSince >= rule.days_threshold;
        if (qualifies && !member.roles.cache.has(rule.role_id)) {
          const role = message.guild.roles.cache.get(rule.role_id);
          if (role) {
            await member.roles.add(role).catch(() => {});
            added++;
          }

          if (!rule.cumulative) {
            const lower = rules.filter(r => r.days_threshold < rule.days_threshold);
            for (const lr of lower) {
              if (member.roles.cache.has(lr.role_id)) {
                await member.roles.remove(lr.role_id).catch(() => {});
              }
            }
          }
        }
      }
    }

    return processingMsg.edit({ embeds: [E.success('Vérification terminée', `**${added}** attribution(s) effectuée(s).`)] });
  }

  return message.reply({ embeds: [E.usage(';', 'role ancient <add|del|list|cumul|check>', 'Gestion des rôles d\'ancienneté.')] });
}
