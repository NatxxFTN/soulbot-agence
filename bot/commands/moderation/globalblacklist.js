'use strict';

// ── ;globalblacklist — bannit un user de TOUS les serveurs Soulbot ───────────
// BotOwner UNIQUEMENT. Le ban auto au join est appliqué par
// bot/events/securityMemberListener.js (check global_blacklist en priorité 0).

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const E = require('../../utils/embeds');
const { warningEmbed, successEmbed, errorEmbed, infoEmbed } = require('../../utils/response-builder');
const { db } = require('../../database');
const { isOwner } = require('../../core/permissions');

const _add    = db.prepare('INSERT OR REPLACE INTO global_blacklist (user_id, reason, moderator) VALUES (?, ?, ?)');
const _remove = db.prepare('DELETE FROM global_blacklist WHERE user_id = ?');
const _list   = db.prepare('SELECT * FROM global_blacklist ORDER BY added_at DESC LIMIT 30');

module.exports = {
  name       : 'globalblacklist',
  aliases    : ['gbl', 'globalbl'],
  category   : 'moderation',
  description: 'Blacklist globale : bannit un utilisateur de TOUS les serveurs Soulbot.',
  usage      : ';globalblacklist <add @user raison... | remove @user | list>',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    if (!isOwner(message.author.id)) {
      return message.reply({ embeds: [errorEmbed('Accès refusé', 'Commande réservée au **BotOwner**.')] });
    }

    const sub = (args[0] ?? 'list').toLowerCase();

    // ── list ─────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const rows = _list.all();
      if (!rows.length) return message.reply({ embeds: [infoEmbed('Blacklist globale', 'Aucun utilisateur blacklisté.')] });
      const lines = rows.map(r => `<@${r.user_id}> — ${r.reason ?? '*sans raison*'} (<t:${r.added_at}:R>)`);
      return message.reply({
        embeds: [infoEmbed(`Blacklist globale — ${rows.length} entrée(s)`, lines.join('\n'))],
        allowedMentions: { parse: [] },
      });
    }

    const targetId = (args[1] ?? '').replace(/[<@!>]/g, '');
    if (!/^\d{15,20}$/.test(targetId)) {
      return message.reply({ embeds: [errorEmbed('Usage', this.usage)] });
    }

    // ── remove ───────────────────────────────────────────────────────────────
    if (sub === 'remove') {
      const removed = _remove.run(targetId).changes > 0;
      return message.reply({
        embeds: [removed
          ? successEmbed('Retiré', `<@${targetId}> n'est plus sur la blacklist globale. Les bans existants ne sont PAS levés automatiquement.`)
          : errorEmbed('Introuvable', `<@${targetId}> n'est pas sur la blacklist globale.`)],
        allowedMentions: { parse: [] },
      });
    }

    // ── add (avec confirmation boutons) ──────────────────────────────────────
    if (sub === 'add') {
      const reason = args.slice(2).join(' ').trim() || 'Aucune raison fournie';
      if (targetId === message.author.id) {
        return message.reply({ embeds: [errorEmbed('Refusé', 'Tu ne peux pas te blacklister toi-même.')] });
      }

      const confirmId = `gbl_confirm_${message.id}`;
      const cancelId  = `gbl_cancel_${message.id}`;
      const prompt = await message.reply({
        embeds: [warningEmbed(
          'Blacklist globale — confirmation',
          `Bannir <@${targetId}> de **${client.guilds.cache.size} serveurs** ?\n**Raison :** ${reason}\n\nAction lourde — les bans sont posés serveur par serveur.`,
        )],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(confirmId).setLabel('Confirmer le ban global').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(cancelId).setLabel('Annuler').setStyle(ButtonStyle.Secondary),
        )],
        allowedMentions: { parse: [] },
      });

      const collector = prompt.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id && [confirmId, cancelId].includes(i.customId),
        time: 30_000, max: 1,
      });

      collector.on('collect', async (i) => {
        if (i.customId === cancelId) {
          return i.update({ embeds: [infoEmbed('Annulé', 'Aucun ban appliqué.')], components: [] });
        }
        await i.update({ embeds: [infoEmbed('En cours…', 'Ban global en application sur tous les serveurs.')], components: [] });

        _add.run(targetId, reason, message.author.id);
        let banned = 0, failed = 0;
        for (const guild of client.guilds.cache.values()) {
          try {
            await guild.bans.create(targetId, { reason: `Global blacklist : ${reason}` });
            banned++;
          } catch { failed++; }
        }

        await i.editReply({
          embeds: [successEmbed(
            'Blacklist globale appliquée',
            `<@${targetId}> banni de **${banned}** serveur(s)` +
            (failed ? ` — ${failed} échec(s) (permissions/hiérarchie)` : '') +
            `.\nToute tentative de re-join sera auto-bannie.`,
          )],
          allowedMentions: { parse: [] },
        });
      });

      collector.on('end', (collected, r) => {
        if (r === 'time' && collected.size === 0) {
          prompt.edit({ embeds: [errorEmbed('Expiré', 'Confirmation expirée — aucun ban appliqué.')], components: [] }).catch(() => {});
        }
      });
      return;
    }

    return message.reply({ embeds: [E.error('Sous-commande inconnue', this.usage)] });
  },
};
