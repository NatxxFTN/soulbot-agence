'use strict';

const storage = require('../../core/schedule-storage');
const { e } = require('../../core/emojis');
const { renderSchedulePanel } = require('../../ui/panels/schedule-panel');
const {
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

const ACTIONS = new Set(['ban', 'kick', 'unban', 'role_add', 'role_remove', 'message']);

module.exports = {
  name        : 'schedule',
  aliases     : ['sched', 'plan'],
  description : 'Programme une action (ban, kick, message, role) pour plus tard',
  usage       : ';schedule <@user|#salon> <action> <délai> [raison]  |  ;schedule list  |  ;schedule cancel <id>',
  guildOnly   : true,
  permissions : ['ManageGuild'],

  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();

    // ── list ────────────────────────────────────────────────────────────
    if (sub === 'list' || sub === 'ls') {
      const rows = storage.listPending(message.guild.id);
      return message.reply({
        ...renderSchedulePanel(message.guild, rows),
        allowedMentions: { repliedUser: false },
      });
    }

    // ── cancel ──────────────────────────────────────────────────────────
    if (sub === 'cancel' || sub === 'rm') {
      const id = parseInt(args[1], 10);
      if (!id) {
        return message.reply(toEmbedReply(warningEmbed({
          title: 'Usage',
          description: '`;schedule cancel <id>`',
          category: 'Innovation',
        })));
      }
      const ok = storage.cancel(id, message.guild.id);
      if (ok) {
        return message.reply(toEmbedReply(successEmbed({
          title: 'Schedule annulé',
          description: `Le schedule \`#${id}\` a été annulé.`,
          user: message.author,
          category: 'Innovation',
        })));
      }
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Schedule introuvable',
        description: `Le schedule \`#${id}\` n'existe pas ou a déjà été exécuté.`,
        category: 'Innovation',
      })));
    }

    // ── create ──────────────────────────────────────────────────────────
    if (args.length < 3) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage — créer un schedule',
        description:
          '`;schedule <@user|#salon> <action> <délai> [raison|contenu]`\n\n' +
          '**Actions :** `ban` · `kick` · `unban` · `role_add <roleId>` · `role_remove <roleId>` · `message`\n' +
          '**Délais :** `30s` · `5m` · `2h` · `1d`\n\n' +
          '**Exemples :**\n' +
          '`;schedule @user ban 2h raid spam`\n' +
          '`;schedule #annonces message 30m Rappel : event à 20h`\n\n' +
          'Voir aussi : `;schedule list` · `;schedule cancel <id>`',
        category: 'Innovation',
      })));
    }

    const targetRaw = args[0];
    const action    = args[1].toLowerCase();
    if (!ACTIONS.has(action)) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Action inconnue',
        description: `\`${action}\` n'est pas une action supportée.\n\nActions valides : \`ban\`, \`kick\`, \`unban\`, \`role_add\`, \`role_remove\`, \`message\`.`,
        category: 'Innovation',
      })));
    }

    const mentionUser    = targetRaw.match(/^<@!?(\d+)>$/);
    const mentionChannel = targetRaw.match(/^<#(\d+)>$/);
    const rawId          = targetRaw.match(/^\d{17,20}$/);
    let targetId = mentionUser?.[1] || mentionChannel?.[1] || rawId?.[0];
    if (!targetId) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Cible invalide',
        description: 'Mentionne un membre ou un salon.',
        category: 'Innovation',
      })));
    }

    let paramOffset = 2;
    const params = {};
    if (action === 'role_add' || action === 'role_remove') {
      const roleRaw = args[2];
      if (!roleRaw) {
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Rôle manquant',
          description: `Usage : \`;schedule @user ${action} <roleId|@role> <délai>\``,
          category: 'Innovation',
        })));
      }
      const roleMention = roleRaw.match(/^<@&(\d+)>$/);
      const roleId = roleMention?.[1] || (roleRaw.match(/^\d{17,20}$/)?.[0]);
      if (!roleId) {
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Rôle invalide',
          description: 'Mentionne le rôle ou fournis son ID.',
          category: 'Innovation',
        })));
      }
      params.roleId = roleId;
      paramOffset = 3;
    }

    const delayRaw = args[paramOffset];
    const delayMs = storage.parseDelay(delayRaw);
    if (!delayMs) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Délai invalide',
        description: `\`${delayRaw}\` n'est pas reconnu. Formats supportés : \`30s\`, \`5m\`, \`2h\`, \`1d\`.`,
        category: 'Innovation',
      })));
    }

    const rest = args.slice(paramOffset + 1).join(' ').trim();

    if (action === 'message') {
      if (!rest) {
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Contenu manquant',
          description: 'Précise le contenu du message à poster.',
          category: 'Innovation',
        })));
      }
      params.content = rest;
    }

    if (delayMs > 30 * 86_400_000) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Délai trop long',
        description: 'Délai maximum : **30 jours**.',
        category: 'Innovation',
      })));
    }

    const id = storage.createSchedule({
      guildId  : message.guild.id,
      targetId,
      action,
      params,
      executeAt: Date.now() + delayMs,
      authorId : message.author.id,
      reason   : action === 'message' ? null : rest || null,
    });

    if (!id) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Erreur DB',
        description: 'La création du schedule a échoué. Retente dans quelques secondes.',
        category: 'Innovation',
      })));
    }

    const ts = Math.floor((Date.now() + delayMs) / 1000);
    const fields = [
      { name: '🆔 ID',       value: `\`#${id}\``,   inline: true },
      { name: '⚙️ Action',    value: `\`${action}\``, inline: true },
      { name: '🎯 Cible',    value: targetRaw,       inline: true },
      { name: '🕒 Exécution', value: `<t:${ts}:F>\n<t:${ts}:R>`, inline: false },
    ];
    if (action === 'message' && rest) {
      fields.push({ name: '💬 Contenu', value: rest.slice(0, 1000), inline: false });
    } else if (rest) {
      fields.push({ name: '📝 Raison', value: rest, inline: false });
    }

    return message.reply(toEmbedReply(successEmbed({
      title       : 'Schedule créé',
      description : `Programmé pour s'exécuter <t:${ts}:R>.`,
      fields,
      user        : message.author,
      category    : 'Innovation',
    })));
  },
};
