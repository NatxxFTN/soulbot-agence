'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { getUserLevel } = require('../../core/permissions');
const { LEVELS } = require('../../core/permissions-levels');
const { db } = require('../../database');

const COOLDOWN_MS  = 60 * 60 * 1000; // 1 heure
const activeResets = new Map();

module.exports = {
  name       : 'nuke',
  aliases    : ['reset', 'wipe'],
  description: '💣 Supprime TOUT sur le serveur (salons, rôles, emojis). Auto-backup obligatoire avant.',
  usage      : ';nuke',
  ownerOnly  : true,
  guildOnly  : true,

  async execute(message) {
    const { guild, author, channel } = message;

    // 1. Owner strict
    if (getUserLevel(author.id, guild.id) < LEVELS.OWNER) {
      return channel.send({ embeds: [E.error('Accès refusé', 'Owner bot uniquement. **Aucune exception.**')] });
    }

    // 2. Cooldown
    const cooldownRow = db.prepare('SELECT last_reset_at FROM reset_cooldowns WHERE guild_id = ?').get(guild.id);
    if (cooldownRow) {
      const remaining = COOLDOWN_MS - (Date.now() - cooldownRow.last_reset_at);
      if (remaining > 0) {
        const mins = Math.ceil(remaining / 60000);
        return channel.send({ embeds: [E.error('⏳ Cooldown actif', `Un reset récent sur ce serveur.\nAttends encore **${mins} minute(s)** avant de réessayer.`)] });
      }
    }

    // 3. Permissions bot
    const botMember = guild.members.me;
    const needed = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuildExpressions];
    if (!needed.every(p => botMember.permissions.has(p))) {
      return channel.send({
        embeds: [E.error('Permissions insuffisantes',
          'Le bot doit avoir :\n• Gérer les salons\n• Gérer les rôles\n• Gérer les emojis\n\nActive **Administrateur** sur le rôle du bot.')],
      });
    }

    // 4. Étape 1/3 — Saisie du nom exact du serveur
    const sessionId = `${author.id}-${guild.id}`;
    activeResets.set(sessionId, {
      userId   : author.id,
      guildId  : guild.id,
      guildName: guild.name,
      startedAt: Date.now(),
    });

    await channel.send({
      embeds: [E.error('💣 NUKE SERVEUR — Étape 1/3',
        `**⚠️ Cette commande va TOUT SUPPRIMER sur ce serveur.**\n\n` +
        `**Cible :** ${guild.name}\n` +
        `**Membres :** ${guild.memberCount}\n` +
        `**Salons :** ${guild.channels.cache.size}\n` +
        `**Rôles :** ${guild.roles.cache.size - 1}\n\n` +
        `Pour confirmer, tape **EXACTEMENT** le nom du serveur :\n\`${guild.name}\`\n\n` +
        `Tu as **60 secondes**. Tape autre chose = annulation immédiate.\n\n` +
        `💾 Un backup automatique sera créé **avant** toute suppression.\n` +
        `⚠️ Messages et membres ne sont PAS sauvegardables (ToS Discord).`)],
    });

    const filter    = m => m.author.id === author.id;
    const collected = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);

    if (!collected) {
      activeResets.delete(sessionId);
      return channel.send({ embeds: [E.info('Expiré', 'Nuke annulé (timeout 60s).')] });
    }

    const typed = collected.first().content.trim();
    if (typed !== guild.name) {
      activeResets.delete(sessionId);
      return channel.send({ embeds: [E.info('Annulé', `Le nom ne correspond pas (\`${typed}\` ≠ \`${guild.name}\`) — nuke annulé.`)] });
    }

    // Étape 2/3 — Premier bouton
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reset_step2:${sessionId}`)
        .setLabel('⚠️ Continuer vers étape 3/3')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('reset_cancel')
        .setLabel('✗ Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

    return channel.send({
      embeds: [E.warning('💣 NUKE SERVEUR — Étape 2/3',
        `Nom confirmé ✓ : **${guild.name}**\n\n` +
        `**SERA SUPPRIMÉ (irréversible) :**\n` +
        `• Tous les salons texte, vocaux et catégories\n` +
        `• Tous les rôles (sauf @everyone)\n` +
        `• Tous les emojis et stickers custom\n\n` +
        `**SERA SAUVEGARDÉ (auto-backup) :**\n` +
        `• Structure complète (rôles, salons, permissions)\n` +
        `• Tu recevras le nom du backup en DM après l'opération\n\n` +
        `**PERDU DÉFINITIVEMENT :**\n` +
        `• Tous les messages\n` +
        `• Les webhooks et invitations actives\n\n` +
        `Tu peux encore annuler.`)],
      components: [row2],
    });
  },
};

module.exports.activeResets = activeResets;
module.exports.COOLDOWN_MS  = COOLDOWN_MS;
