'use strict';

const { db } = require('../../database');
const L = require('../../core/logs-v3-helper');
const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

const STMT_WARN = db.prepare(
  'INSERT INTO warnings (guild_id, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?)',
);
const STMT_MOD_LOG = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
);

const MIN_USERS = 2;
const MAX_USERS = 50;

function parseTargets(message, rawArgs) {
  const idx = rawArgs.findIndex(a => a === '|');
  const userArgs = idx >= 0 ? rawArgs.slice(0, idx) : rawArgs;
  const reasonArgs = idx >= 0 ? rawArgs.slice(idx + 1) : [];

  const ids = new Set();
  for (const tok of userArgs) {
    const m = tok.match(/^<@!?(\d{15,})>$/) || tok.match(/^(\d{15,})$/);
    if (m) ids.add(m[1]);
  }

  const targets = [];
  for (const id of ids) {
    const member = message.guild.members.cache.get(id);
    if (member && !member.user.bot) targets.push(member);
  }

  return { targets, reason: reasonArgs.join(' ').trim() || 'Aucune raison fournie' };
}

module.exports = {
  name       : 'masswarn',
  aliases    : ['mwarn'],
  description: 'Avertit plusieurs membres en masse (avec confirmation).',
  usage      : ';masswarn <@u1> <@u2> ... | <raison>',
  cooldown   : 10,
  guildOnly  : true,
  permissions: ['ModerateMembers'],

  async execute(message, args) {
    const isConfirm = args[0] === 'confirm';
    const rest = isConfirm ? args.slice(1) : args;

    const { targets, reason } = parseTargets(message, rest);

    if (targets.length < MIN_USERS) {
      return message.reply(P.warningPanel(
        'Trop peu de cibles',
        `Mentionne au moins **${MIN_USERS}** membres.\nUsage : \`${this.usage}\``,
      ));
    }
    if (targets.length > MAX_USERS) {
      return message.reply(P.warningPanel('Trop de cibles', `Maximum **${MAX_USERS}** membres par exécution.`));
    }

    const list = targets.map(t => `• ${t.user.tag} \`${t.id}\``).join('\n');
    const previewBody = `**Cibles** : ${targets.length} membres\n${list}\n\n**Raison** : ${reason}`;
    const confirmCmd = `;masswarn confirm ${targets.map(t => `<@${t.id}>`).join(' ')} | ${reason}`;

    if (!isConfirm) {
      return message.reply(P.confirmPanel('⚠️ Mass-warn — Confirmation', previewBody, confirmCmd));
    }

    const guildId = message.guild.id;
    const modTag = message.author.tag;
    const modId = message.author.id;

    let warned = 0;
    for (const t of targets) {
      try {
        STMT_WARN.run(guildId, t.id, t.user.tag, modId, modTag, reason);
        STMT_MOD_LOG.run(guildId, 'WARN', t.id, t.user.tag, modId, modTag, reason);
        audit.recordModAction(guildId, t.id, modId, 'WARN', reason);
        L.log(message.guild, 'mod_warn', {
          user: t.user, member: t, executor: message.author, reason,
          summary: `${t.user.tag} warn (mass) par ${modTag}`,
          actorId: modId, targetId: t.id,
        });
        t.send(`⚠️ Tu as reçu un avertissement (mass) sur **${message.guild.name}**.\nRaison : ${reason}`).catch(() => {});
        warned++;
      } catch { /* skip */ }
    }

    return message.reply(P.successPanel(
      '✅ Mass-warn exécuté',
      `**${warned} / ${targets.length}** membres avertis.\n**Raison** : ${reason}`,
    ));
  },
};
