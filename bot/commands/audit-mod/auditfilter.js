'use strict';

const { AuditLogEvent } = require('discord.js');
const P = require('../../core/audit-mod-panels');

const ACTION_MAP = {
  ban                 : AuditLogEvent.MemberBanAdd,
  unban               : AuditLogEvent.MemberBanRemove,
  kick                : AuditLogEvent.MemberKick,
  member_update       : AuditLogEvent.MemberUpdate,
  role_create         : AuditLogEvent.RoleCreate,
  role_delete         : AuditLogEvent.RoleDelete,
  role_update         : AuditLogEvent.RoleUpdate,
  channel_create      : AuditLogEvent.ChannelCreate,
  channel_delete      : AuditLogEvent.ChannelDelete,
  channel_update      : AuditLogEvent.ChannelUpdate,
  message_delete      : AuditLogEvent.MessageDelete,
  message_bulk_delete : AuditLogEvent.MessageBulkDelete,
  invite_create       : AuditLogEvent.InviteCreate,
  emoji_create        : AuditLogEvent.EmojiCreate,
  emoji_delete        : AuditLogEvent.EmojiDelete,
  emoji_update        : AuditLogEvent.EmojiUpdate,
};

const PERIOD_MAP = {
  '24h': 86400_000,
  '7d' : 7 * 86400_000,
  '30d': 30 * 86400_000,
};

module.exports = {
  name       : 'auditfilter',
  aliases    : [],
  description: 'Filtre l\'audit log Discord par action et utilisateur.',
  usage      : ';auditfilter <action> [@user] [24h|7d|30d] [pN]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ViewAuditLog'],

  async execute(message, args) {
    if (!args.length) {
      return message.reply(P.warningPanel(
        'Action manquante',
        `Usage : \`;auditfilter <action> [@user] [24h|7d|30d] [pN]\`\n` +
        `Actions : \`${Object.keys(ACTION_MAP).join('`, `')}\``,
      ));
    }

    const action = args[0].toLowerCase();
    if (!ACTION_MAP[action]) {
      return message.reply(P.warningPanel('Action inconnue', `Actions valides : \`${Object.keys(ACTION_MAP).join('`, `')}\``));
    }

    const targetUser = message.mentions.users.first();
    let page = 1;
    let periodMs = null;
    for (const a of args) {
      if (PERIOD_MAP[a]) periodMs = PERIOD_MAP[a];
      if (/^p\d+$/i.test(a)) page = parseInt(a.slice(1), 10);
    }

    let entries;
    try {
      const audit = await message.guild.fetchAuditLogs({ type: ACTION_MAP[action], limit: 100 });
      entries = [...audit.entries.values()];
    } catch {
      return message.reply(P.dangerPanel('Erreur', 'Impossible de fetch l\'audit log Discord.'));
    }

    if (targetUser) {
      entries = entries.filter(e => e.executor?.id === targetUser.id || e.target?.id === targetUser.id);
    }
    if (periodMs) {
      const cutoff = Date.now() - periodMs;
      entries = entries.filter(e => e.createdTimestamp >= cutoff);
    }

    const items = entries.map(e => {
      const at = `<t:${Math.floor(e.createdTimestamp / 1000)}:R>`;
      const who = e.executor ? `<@${e.executor.id}>` : '*inconnu*';
      const target = e.target?.id ? `<@${e.target.id}>` : (e.target?.name || '—');
      const reason = e.reason ? ` — ${String(e.reason).slice(0, 80)}` : '';
      return `• ${at} · ${who} → ${target}${reason}`;
    });

    return message.reply(P.paginatedList(
      `📜 Audit Log : \`${action}\`${targetUser ? ` (user: ${targetUser.tag})` : ''}${periodMs ? ` · ${args.find(a => PERIOD_MAP[a])}` : ''}`,
      items,
      page,
      10,
      P.COLORS.info,
    ));
  },
};
