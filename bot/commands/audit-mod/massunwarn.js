'use strict';

const { db } = require('../../database');
const L = require('../../core/logs-v3-helper');
const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

const STMT_CLEAR = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?');
const STMT_COUNT = db.prepare('SELECT COUNT(*) AS count FROM warnings WHERE guild_id = ? AND user_id = ?');

const MIN_USERS = 2;
const MAX_USERS = 50;

function parseTargets(message, rawArgs) {
  const ids = new Set();
  for (const tok of rawArgs) {
    const m = tok.match(/^<@!?(\d{15,})>$/) || tok.match(/^(\d{15,})$/);
    if (m) ids.add(m[1]);
  }
  const targets = [];
  for (const id of ids) {
    const member = message.guild.members.cache.get(id);
    if (member && !member.user.bot) targets.push(member);
  }
  return targets;
}

module.exports = {
  name       : 'massunwarn',
  aliases    : ['munwarn', 'mclearwarns'],
  description: 'Efface les avertissements de plusieurs membres en masse.',
  usage      : ';massunwarn <@u1> <@u2> ...',
  cooldown   : 10,
  guildOnly  : true,
  permissions: ['ModerateMembers'],

  async execute(message, args) {
    const isConfirm = args[0] === 'confirm';
    const rest = isConfirm ? args.slice(1) : args;
    const targets = parseTargets(message, rest);

    if (targets.length < MIN_USERS) {
      return message.reply(P.warningPanel(
        'Trop peu de cibles',
        `Mentionne au moins **${MIN_USERS}** membres.\nUsage : \`${this.usage}\``,
      ));
    }
    if (targets.length > MAX_USERS) {
      return message.reply(P.warningPanel('Trop de cibles', `Maximum **${MAX_USERS}** membres par exécution.`));
    }

    const guildId = message.guild.id;
    const previewLines = targets.map(t => {
      const { count } = STMT_COUNT.get(guildId, t.id);
      return `• ${t.user.tag} \`${t.id}\` — **${count}** warn${count > 1 ? 's' : ''} à supprimer`;
    });

    const confirmCmd = `;massunwarn confirm ${targets.map(t => `<@${t.id}>`).join(' ')}`;

    if (!isConfirm) {
      return message.reply(P.confirmPanel(
        '🧹 Mass-unwarn — Confirmation',
        `**Cibles** : ${targets.length} membres\n${previewLines.join('\n')}`,
        confirmCmd,
      ));
    }

    let cleared = 0;
    let totalRemoved = 0;
    for (const t of targets) {
      try {
        const { count } = STMT_COUNT.get(guildId, t.id);
        const res = STMT_CLEAR.run(guildId, t.id);
        if (res.changes >= 0) {
          cleared++;
          totalRemoved += count;
          audit.recordModAction(guildId, t.id, message.author.id, 'UNWARN', `Mass-unwarn (${count} warns)`);
          L.log(message.guild, 'mod_unmute', {
            user: t.user, member: t, executor: message.author,
            reason: `Mass-unwarn (${count} warns supprimés)`,
            summary: `${t.user.tag} — ${count} warn(s) effacés (mass) par ${message.author.tag}`,
            actorId: message.author.id, targetId: t.id,
          });
        }
      } catch { /* skip */ }
    }

    return message.reply(P.successPanel(
      '✅ Mass-unwarn exécuté',
      `**${cleared} / ${targets.length}** membres traités · **${totalRemoved}** avertissement(s) supprimé(s) au total.`,
    ));
  },
};
